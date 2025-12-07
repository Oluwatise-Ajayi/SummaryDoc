import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import * as mammoth from 'mammoth';
import OpenAI from 'openai';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

@Injectable()
export class DocumentsService {
    private s3Client: S3Client;
    private bucketName: string;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        this.s3Client = new S3Client({
            region: this.configService.get('AWS_REGION'),
            credentials: {
                accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID') || 'mock',
                secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY') || 'mock',
            },
            endpoint: this.configService.get('AWS_ENDPOINT'),
            forcePathStyle: true,
        });
        this.bucketName = this.configService.get('AWS_S3_BUCKET_NAME') || 'documents';
    }

    async uploadDocument(file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        const validMimeTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];

        if (!validMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                'Unsupported file type. Only PDF and DOCX are allowed.',
            );
        }

        // 1. Extract Text
        let extractedText = '';
        if (file.mimetype === 'application/pdf') {
            try {
                const loadingTask = pdfjsLib.getDocument({
                    data: new Uint8Array(file.buffer),
                    useSystemFonts: true,
                });
                const pdfDocument = await loadingTask.promise;
                const numPages = pdfDocument.numPages;

                const textPromises: Promise<string>[] = [];
                for (let i = 1; i <= numPages; i++) {
                    textPromises.push(
                        pdfDocument.getPage(i).then(async (page) => {
                            const textContent = await page.getTextContent();
                            return textContent.items
                                .map((item: any) => item.str)
                                .join(' ');
                        })
                    );
                }

                const pageTexts = await Promise.all(textPromises);
                extractedText = pageTexts.join('\n\n');
            } catch (error) {
                console.error('PDF extraction error:', error);
                throw new BadRequestException('Failed to extract PDF text');
            }
        } else if (
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            try {
                const result = await mammoth.extractRawText({ buffer: file.buffer });
                extractedText = result.value;
            } catch (error) {
                console.error('DOCX extraction error:', error);
                throw new BadRequestException('Failed to extract DOCX text');
            }
        }

        // Check if text is empty
        if (!extractedText || extractedText.trim().length === 0) {
            throw new BadRequestException(
                'Unable to extract text. The document might be empty or a scanned image.',
            );
        }

        // 2. Upload to S3
        const s3Key = `${Date.now()}-${file.originalname}`;
        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
                Body: file.buffer,
                ContentType: file.mimetype,
            }),
        );

        // 3. Save to DB
        const document = await this.prisma.document.create({
            data: {
                originalName: file.originalname,
                mimeType: file.mimetype,
                fileSize: file.size,
                s3Key: s3Key,
                extractedText: extractedText,
            },
        });

        return document;
    }

    async analyzeDocument(id: string) {
        const document = await this.prisma.document.findUnique({ where: { id } });
        if (!document) {
            throw new BadRequestException('Document not found');
        }
        if (!document.extractedText || document.extractedText.trim().length === 0) {
            throw new BadRequestException('Document has no extracted text');
        }

        const openai = new OpenAI({
            apiKey: this.configService.get('OPENROUTER_API_KEY'),
            baseURL: 'https://openrouter.ai/api/v1',
        });

        const prompt = `
    Analyze the following document text and return a JSON object with:
    - summary: A concise summary of the content.
    - type: The type of document (e.g., Invoice, Resume, Report).
    - attributes: Key-value pairs of extracted metadata (e.g., dates, names, amounts).

    Text:
    ${document.extractedText.slice(0, 10000)}
    `;

        let content = '';

        try {
            const completion = await openai.chat.completions.create({
                model: 'openai/gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
            });
            content = completion.choices[0].message.content || '';
        } catch (error) {
            console.error('OpenAI analysis error:', error);
            throw new BadRequestException('Failed to analyze document with AI');
        }

        let analysisResult: any = {};

        if (!content) {
            analysisResult = { summary: 'No analysis generated' };
        } else {
            try {
                // Find JSON in content
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    analysisResult = JSON.parse(jsonMatch[0]);
                } else {
                    analysisResult = { summary: content };
                }
            } catch (e) {
                analysisResult = { summary: content };
            }
        }

        return this.prisma.document.update({
            where: { id },
            data: {
                summary: analysisResult.summary,
                docType: analysisResult.type,
                metadata: JSON.stringify(analysisResult.attributes || {}),
            },
        });
    }

    async getDocument(id: string) {
        const document = await this.prisma.document.findUnique({ where: { id } });
        if (!document) {
            throw new BadRequestException('Document not found');
        }
        return document;
    }
}
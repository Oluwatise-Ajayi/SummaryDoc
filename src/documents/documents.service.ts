import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import * as mammoth from 'mammoth';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

@Injectable()
export class DocumentsService {
    private s3Client: S3Client;
    private bucketName: string;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        @InjectQueue('documents') private documentQueue: Queue,
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

    async analyzeDocument(id: string, force?: boolean) {
        const document = await this.prisma.document.findUnique({ where: { id } });
        if (!document) {
            throw new BadRequestException('Document not found');
        }
        if (document.summary && !force) {
            throw new BadRequestException(
                'Document already analyzed. Use force=true to re-analyze.',
            );
        }

        if (!document.extractedText || document.extractedText.trim().length === 0) {
            throw new BadRequestException('Document has no extracted text');
        }

        const job = await this.documentQueue.add('analyze', { id, force });
        return { jobId: job.id, message: 'Analysis started' };
    }

    async getJobStatus(jobId: string) {
        const job = await this.documentQueue.getJob(jobId);
        if (!job) {
            return { status: 'not_found' };
        }
        const state = await job.getState();
        return {
            jobId: job.id,
            status: state,
            data: job.data,
            returnValue: job.returnvalue,
            failedReason: job.failedReason,
        };
    }

    async getDocument(id: string) {
        const document = await this.prisma.document.findUnique({ where: { id } });
        if (!document) {
            throw new BadRequestException('Document not found');
        }
        return document;
    }
}
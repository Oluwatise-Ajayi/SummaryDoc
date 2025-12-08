import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Processor('documents')
export class DocumentsProcessor extends WorkerHost {
    private readonly logger = new Logger(DocumentsProcessor.name);
    private openai: OpenAI;

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {
        super();
        this.openai = new OpenAI({
            apiKey: this.configService.get('OPENROUTER_API_KEY'),
            baseURL: 'https://openrouter.ai/api/v1',
        });
    }

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

        if (job.name === 'analyze') {
            const { id, force } = job.data;
            return this.handleAnalyze(id, force);
        }
    }

    private async handleAnalyze(id: string, force: boolean) {
        const document = await this.prisma.document.findUnique({ where: { id } });
        if (!document) {
            throw new Error('Document not found');
        }

        if (document.summary && !force) {
            this.logger.log(`Document ${id} already analyzed.`);
            return { status: 'skipped', message: 'Already analyzed' };
        }

        if (!document.extractedText || document.extractedText.trim().length === 0) {
            throw new Error('Document has no extracted text');
        }

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
            const completion = await this.openai.chat.completions.create({
                model: 'openai/gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
            });
            content = completion.choices[0].message.content || '';
        } catch (error) {
            this.logger.error('OpenAI analysis error:', error);
            throw new Error('Failed to analyze document with AI');
        }

        let analysisResult: any = {};

        if (!content) {
            analysisResult = { summary: 'No analysis generated' };
        } else {
            try {
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

        await this.prisma.document.update({
            where: { id },
            data: {
                summary: analysisResult.summary,
                docType: analysisResult.type,
                metadata: analysisResult.attributes || {},
            },
        });

        return { status: 'completed', documentId: id };
    }
}

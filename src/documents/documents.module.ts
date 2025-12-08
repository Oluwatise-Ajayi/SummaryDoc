
import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DocumentsProcessor } from './documents.processor';

@Module({
    imports: [
        ConfigModule,
        BullModule.registerQueue({
            name: 'documents',
        }),
    ],
    controllers: [DocumentsController],
    providers: [DocumentsService, DocumentsProcessor],
})
export class DocumentsModule { }


import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    Param,
    Get,
    Query,
    BadRequestException,
    UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) { }

    @Post('upload')
    @ApiOperation({ summary: 'Upload a file (PDF/DOCX) for processing' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'File uploaded successfully' })
    @ApiResponse({ status: 400, description: 'Validation failed (file size or type)' })
    @UseInterceptors(FilesInterceptor('file'))
    async uploadFile(
        @UploadedFiles() files: Array<Express.Multer.File>,
    ) {
        if (!files || files.length === 0) {
            throw new BadRequestException('No file provided');
        }
        if (files.length > 1) {
            throw new BadRequestException('Please upload only one file at a time');
        }

        const file = files[0];

        if (file.size > 5 * 1024 * 1024) {
            throw new BadRequestException('File is too large. Max size is 5MB');
        }

        return this.documentsService.uploadDocument(file);
    }

    @Post(':id/analyze')
    @ApiOperation({ summary: 'Trigger AI analysis for a document' })
    @ApiParam({ name: 'id', description: 'Document ID' })
    @ApiQuery({ name: 'force', required: false, type: Boolean, description: 'Force re-analysis if already analyzed' })
    @ApiResponse({ status: 200, description: 'Analysis complete' })
    async analyzeDocument(
        @Param('id') id: string,
        @Query('force') force?: boolean,
    ) {
        const forceBool = force === true || String(force) === 'true';
        return this.documentsService.analyzeDocument(id, forceBool);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get document details and analysis' })
    @ApiParam({ name: 'id', description: 'Document ID' })
    @ApiResponse({ status: 200, description: 'Document details' })
    async getDocument(@Param('id') id: string) {
        return this.documentsService.getDocument(id);
    }
}

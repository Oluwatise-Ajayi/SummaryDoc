
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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
                    // new FileTypeValidator({ fileType: '.(pdf|docx)' }), // Regex or mime type
                ],
            }),
        )
        file: Express.Multer.File,
    ) {
        return this.documentsService.uploadDocument(file);
    }

    @Post(':id/analyze')
    async analyzeDocument(@Param('id') id: string) {
        return this.documentsService.analyzeDocument(id);
    }

    @Get(':id')
    async getDocument(@Param('id') id: string) {
        return this.documentsService.getDocument(id);
    }
}

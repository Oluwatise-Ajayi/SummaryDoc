# Document Summary & Analysis API

## Overview
This project is a robust backend API built with NestJS, TypeScript, and Prisma, designed to facilitate document upload, extract text, and perform AI-powered analysis, including summarization and metadata extraction.

## Features
-   💾 **Document Upload**: Securely upload documents (PDF, DOCX) to AWS S3 (or compatible storage).
-   📝 **Text Extraction**: Automatically extract readable text from uploaded PDF and DOCX files.
-   ✨ **AI-Powered Analysis**: Leverage OpenAI/OpenRouter to generate concise summaries, classify document types, and extract key attributes.
-   🔍 **Document Retrieval**: Fetch uploaded and analyzed document details by ID.
-   🗄️ **Robust Data Persistence**: Store document metadata and analysis results using Prisma ORM with SQLite (or PostgreSQL for production).

## Getting Started

### Installation
To get this project up and running locally, follow these steps:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Oluwatise-Ajayi/SummaryDoc.git
    cd SummaryDoc
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Generate Prisma Client**:
    ```bash
    npx prisma generate
    npx prisma db push
    ```

4.  **Run Database Migrations**:
    This will create the `dev.db` SQLite file.
    ```bash
    npx prisma migrate dev --name init
    ```

5.  **Start the Application**:
    ```bash
    npm run start:dev
    ```
    The application will typically run on `http://localhost:3000` or the port specified in your environment variables.

### Environment Variables
Create a `.env` file in the root directory of the project and populate it with the following variables:

```plaintext
# Application Port
PORT=3000

# AWS S3 Configuration (for Minio/LocalStack or actual AWS S3)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin # Example for Minio
AWS_SECRET_ACCESS_KEY=minioadmin # Example for Minio
AWS_ENDPOINT=http://localhost:9000 # Example for Minio/LocalStack S3 endpoint
AWS_S3_BUCKET_NAME=documents # S3 bucket name

# OpenAI/OpenRouter Configuration
OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY_HERE
```

## API Documentation

### Base URL
`http://localhost:3000/api/v1` (or `process.env.PORT`)

### Endpoints

#### POST /documents/upload
Uploads a document for storage and initial text extraction.

**Request**:
`Content-Type: multipart/form-data`

| Field | Type | Description | Required | Example |
| :---- | :--- | :---------- | :------- | :------ |
| `file` | File | The document file to upload (e.g., PDF, DOCX). Max size 5MB. | `true` | (binary file data) |

**Response**:
```json
{
  "id": "clxb9s26g0000d0w2k6y1s1v6",
  "originalName": "example.pdf",
  "mimeType": "application/pdf",
  "fileSize": 12345,
  "s3Key": "1678886400000-example.pdf",
  "extractedText": "Extracted text content...",
  "summary": null,
  "docType": null,
  "metadata": null,
  "createdAt": "2023-03-15T10:00:00.000Z"
}
```

**Errors**:
-   `400 Bad Request`: "No file provided"
-   `400 Bad Request`: "Validation failed (expected size is less than 5242880 bytes)" (File too large)
-   `400 Bad Request`: "Validation failed (expected file type is .(pdf|docx))" (Unsupported file type - if type validator is active)

#### POST /documents/:id/analyze
Triggers AI analysis (summarization, type classification, metadata extraction) for a previously uploaded document.

**Request**:
No payload. The document ID is passed as a URL parameter.

**Response**:
```json
{
  "id": "clxb9s26g0000d0w2k6y1s1v6",
  "originalName": "example.pdf",
  "mimeType": "application/pdf",
  "fileSize": 12345,
  "s3Key": "1678886400000-example.pdf",
  "extractedText": "Extracted text content...",
  "summary": "A concise summary of the document's content.",
  "docType": "Report",
  "metadata": "{\"date\": \"2023-03-10\", \"author\": \"John Doe\"}",
  "createdAt": "2023-03-15T10:00:00.000Z"
}
```

**Errors**:
-   `400 Bad Request`: "Document not found"
-   `400 Bad Request`: "Document has no extracted text"

#### GET /documents/:id
Retrieves the details of a specific document, including its extracted text, summary, and metadata.

**Request**:
No payload. The document ID is passed as a URL parameter.

**Response**:
```json
{
  "id": "clxb9s26g0000d0w2k6y1s1v6",
  "originalName": "example.pdf",
  "mimeType": "application/pdf",
  "fileSize": 12345,
  "s3Key": "1678886400000-example.pdf",
  "extractedText": "Extracted text content...",
  "summary": "A concise summary of the document's content.",
  "docType": "Report",
  "metadata": "{\"date\": \"2023-03-10\", \"author\": \"John Doe\"}",
  "createdAt": "2023-03-15T10:00:00.000Z"
}
```

**Errors**:
-   `400 Bad Request`: "Document not found"

## Usage
Once the API is running, you can interact with it using tools like `curl` or Postman.

### 1. Upload a Document
First, upload a PDF or DOCX file.
```bash
curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/your/document.pdf" \
  http://localhost:3000/documents/upload
```
Replace `/path/to/your/document.pdf` with the actual path to your file. The response will include the `id` of the uploaded document.

### 2. Analyze the Document
Use the `id` obtained from the upload step to trigger AI analysis.
```bash
curl -X POST \
  http://localhost:3000/documents/YOUR_DOCUMENT_ID/analyze
```
Replace `YOUR_DOCUMENT_ID` with the actual ID. The response will show the document updated with `summary`, `docType`, and `metadata`.

### 3. Retrieve Document Details
Fetch the full details of any document using its `id`.
```bash
curl -X GET \
  http://localhost:3000/documents/YOUR_DOCUMENT_ID
```
Replace `YOUR_DOCUMENT_ID` with the actual ID. This will return the complete document object.

## Contributing
We welcome contributions to enhance this project! To contribute:

*   🍴 Fork the repository.
*   🌳 Create a new branch (`git checkout -b feature/your-feature-name`).
*   📝 Make your changes and ensure they adhere to the project's coding standards.
*   🧪 Write and run tests to ensure your changes work as expected and do not introduce regressions.
*   🚀 Commit your changes (`git commit -m 'feat: Add new feature'`).
*   ⬆️ Push to your branch (`git push origin feature/your-feature-name`).
*   🤝 Open a Pull Request, describing your changes in detail.

## License
This project is currently unlicensed.

## Author
**Oluwatise Ajayi**

*   LinkedIn: [https://linkedin.com/in/Oluwatise-Ajayi](https://linkedin.com/in/Oluwatise-Ajayi)
*   Twitter: [https://twitter.com/Oluwatise-Ajayi](https://twitter.com/Oluwatise-Ajayi)

---
[![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/)
[![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/index.html)
[![AWS S3](https://img.shields.io/badge/AWS%20S3-569A31?style=for-the-badge&logo=amazons3&logoColor=white)](https://aws.amazon.com/s3/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![ESLint](https://img.shields.io/badge/eslint-%234B32C3.svg?style=for-the-badge&logo=eslint&logoColor=white)](https://eslint.org/)
[![Prettier](https://img.shields.io/badge/prettier-%231A2C34.svg?style=for-the-badge&logo=prettier&logoColor=white)](https://prettier.io/)

[![Readme was generated by Dokugen](https://img.shields.io/badge/Readme%20was%20generated%20by-Dokugen-brightgreen)](https://www.npmjs.com/package/dokugen)
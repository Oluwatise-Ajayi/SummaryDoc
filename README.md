# Document AI: Intelligent Document Summarization API

## Overview
This project is a robust backend API built with TypeScript, Node.js, and the NestJS framework, leveraging Prisma as an ORM for data persistence. It facilitates the intelligent processing of documents, including upload, text extraction, and AI-driven summarization and metadata analysis.

## Features
- **File Upload Service**: Accepts PDF and DOCX files, storing them securely in AWS S3.
- **Advanced Text Extraction**: Automatically extracts text content from uploaded PDF and DOCX documents.
- **AI-Powered Document Analysis**: Utilizes OpenAI (via OpenRouter) to generate concise summaries, classify document types, and extract key metadata.
- **Prisma ORM Integration**: Manages document metadata persistence and retrieval with an SQLite database.
- **Scalable Architecture**: Built with NestJS, providing a modular and enterprise-grade structure.
- **Comprehensive API Documentation**: Integrated Swagger UI for easy exploration and testing of endpoints.

## Getting Started

### Installation
To get a copy of this project up and running on your local machine, follow these steps:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Oluwatise-Ajayi/SummaryDoc.git
    cd SummaryDoc
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Setup Database**: Generate the Prisma client and run migrations to create the SQLite database schema.
    ```bash
    npx prisma generate
    npx prisma migrate dev --name init
    ```

4.  **Build the Project**:
    ```bash
    npm run build
    ```

5.  **Start the Application**:
    ```bash
    npm run start:dev
    # or for production
    npm run start:prod
    ```
    The API will be accessible at `http://localhost:3000` (or your specified port).

### Environment Variables
The application requires the following environment variables to be set. Create a `.env` file in the project root based on `.env.example`.

-   `PORT`: Port for the application to listen on.
    _Example_: `PORT=3000`
-   `DATABASE_URL`: Connection string for the database. (e.g., SQLite file path)
    _Example_: `DATABASE_URL="file:./dev.db"`
-   `AWS_REGION`: AWS region for S3 bucket.
    _Example_: `AWS_REGION=us-east-1`
-   `AWS_ACCESS_KEY_ID`: Your AWS access key ID.
    _Example_: `AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE`
-   `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key.
    _Example_: `AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`
-   `AWS_ENDPOINT`: (Optional) Custom endpoint for S3, useful for local testing with MinIO or LocalStack.
    _Example_: `AWS_ENDPOINT=http://localhost:4566`
-   `AWS_S3_BUCKET_NAME`: Name of the S3 bucket to store documents.
    _Example_: `AWS_S3_BUCKET_NAME=my-document-bucket`
-   `OPENROUTER_API_KEY`: API key for OpenRouter (used to access OpenAI models).
    _Example_: `OPENROUTER_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Usage
Once the application is running, you can interact with the API to upload documents, trigger analysis, and retrieve processed information.

1.  **Access API Documentation**: Navigate to `http://localhost:3000/docs` in your browser to view the interactive Swagger UI.

2.  **Upload a Document**: Use the `/documents/upload` endpoint to send a PDF or DOCX file. The API will store the file in S3 and extract its text content, returning a `Document` object.

3.  **Analyze a Document**: With the `id` of an uploaded document, call the `/documents/:id/analyze` endpoint. This will initiate an AI process to summarize the content, determine its type, and extract structured metadata.

4.  **Retrieve Document Details**: To fetch the complete details of any document, including its summary and extracted metadata, use the `/documents/:id` endpoint.

## API Documentation
### Base URL
`http://localhost:3000`

### Endpoints
#### POST /documents/upload
Uploads a PDF or DOCX file for processing. The file is stored in S3, and its text content is extracted before being saved to the database.

**Request**:
Requires `multipart/form-data` with a `file` field.
The file must be either `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document` and have a maximum size of 5MB.

_Body Example_:
(Use a `multipart/form-data` client like Postman or Insomnia, selecting `form-data` and setting `file` as type `File`.)

**Response**:
Returns the created Document object.

```json
{
  "id": "c1f7b0e1-d5f9-4c6e-8a2f-1a3b4c5d6e7f",
  "originalName": "report.pdf",
  "mimeType": "application/pdf",
  "fileSize": 1500000,
  "s3Key": "1678886400000-report.pdf",
  "extractedText": "This is the extracted text content from the PDF...",
  "summary": null,
  "docType": null,
  "metadata": null,
  "createdAt": "2023-03-15T10:00:00.000Z"
}
```

**Errors**:
-   `400 Bad Request`: No file provided.
-   `400 Bad Request`: File type or size validation failed.

#### POST /documents/:id/analyze
Triggers AI analysis (summarization, type classification, metadata extraction) for a previously uploaded document.

**Request**:
No request body required. The document ID is passed as a path parameter.

**Response**:
Returns the updated Document object after analysis.

```json
{
  "id": "c1f7b0e1-d5f9-4c6e-8a2f-1a3b4c5d6e7f",
  "originalName": "report.pdf",
  "mimeType": "application/pdf",
  "fileSize": 1500000,
  "s3Key": "1678886400000-report.pdf",
  "extractedText": "This is the extracted text content from the PDF...",
  "summary": "This report details the Q1 financial performance...",
  "docType": "Report",
  "metadata": "{\"project_name\": \"Project X\", \"date\": \"2023-03-15\"}",
  "createdAt": "2023-03-15T10:00:00.000Z"
}
```

**Errors**:
-   `400 Bad Request`: Document not found.
-   `400 Bad Request`: Document has no extracted text.

#### GET /documents/:id
Retrieves the full details of a specific document, including any available summaries and extracted metadata.

**Request**:
No request body required. The document ID is passed as a path parameter.

**Response**:
Returns the Document object.

```json
{
  "id": "c1f7b0e1-d5f9-4c6e-8a2f-1a3b4c5d6e7f",
  "originalName": "report.pdf",
  "mimeType": "application/pdf",
  "fileSize": 1500000,
  "s3Key": "1678886400000-report.pdf",
  "extractedText": "This is the extracted text content from the PDF...",
  "summary": "This report details the Q1 financial performance...",
  "docType": "Report",
  "metadata": "{\"project_name\": \"Project X\", \"date\": \"2023-03-15\"}",
  "createdAt": "2023-03-15T10:00:00.000Z"
}
```

**Errors**:
-   `400 Bad Request`: Document not found.

## Technologies Used
| Technology | Description                                        | Link                                                                        |
| :--------- | :------------------------------------------------- | :-------------------------------------------------------------------------- |
| **NestJS** | A progressive Node.js framework for building efficient, reliable, and scalable server-side applications. | [NestJS](https://nestjs.com/)                                               |
| **TypeScript** | A strongly typed superset of JavaScript that compiles to plain JavaScript.      | [TypeScript](https://www.typescriptlang.org/)                               |
| **Prisma** | Next-generation ORM for Node.js and TypeScript.    | [Prisma](https://www.prisma.io/)                                            |
| **SQLite** | A C-language library that implements a small, fast, self-contained, high-reliability, full-featured, SQL database engine. | [SQLite](https://www.sqlite.org/)                                           |
| **AWS S3** | Object storage built to store and retrieve any amount of data from anywhere. | [AWS S3](https://aws.amazon.com/s3/)                                        |
| **OpenAI** | Provides advanced AI models for various natural language processing tasks. | [OpenAI](https://openai.com/)                                               |
| **OpenRouter** | Unified API for various LLMs, enabling flexible model selection. | [OpenRouter](https://openrouter.ai/)                                        |
| **`pdfjs-dist`** | PDF.js is a Portable Document Format (PDF) viewer built with HTML5. | [pdfjs-dist](https://mozilla.github.io/pdf.js/)                             |
| **`mammoth.js`** | Converts .docx documents to HTML.                  | [mammoth.js](https://www.npmjs.com/package/mammoth)                         |
| **Swagger** | Tooling for documenting, designing, and consuming RESTful APIs. | [Swagger](https://swagger.io/)                                              |

## Contributing
Contributions are welcome! If you have suggestions for improvements or new features, please follow these steps:

✨ Fork the repository.
🛠️ Create a new branch for your feature or bug fix.
💡 Implement your changes and ensure tests pass.
📝 Write clear, concise commit messages.
🚀 Submit a pull request detailing your changes.

## Author Info
- **Oluwatise Ajayi**
- LinkedIn: [Your LinkedIn Profile](https://linkedin.com/in/your-username)
- Twitter: [Your Twitter Handle](https://twitter.com/your-username)

## Badges
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-v11-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-v5-darkblue.svg)](https://www.prisma.io/)
[![AWS S3](https://img.shields.io/badge/AWS_S3-Storage-orange.svg)](https://aws.amazon.com/s3/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--3.5--turbo-lightgray.svg)](https://openai.com/)

---

[![Readme was generated by Dokugen](https://img.shields.io/badge/Readme%20was%20generated%20by-Dokugen-brightgreen)](https://www.npmjs.com/package/dokugen)
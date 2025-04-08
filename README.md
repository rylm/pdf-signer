# PDF QR Code Stamper (v0.2)

A Next.js application that allows users to upload PDFs, stamp them with QR codes for verification, and upload them to S3 for cloud storage and sharing.

## Features

- Upload PDFs directly from your browser
- Generate QR codes linked to the final S3 URL
- Visual UI for placing QR codes precisely on your document
- Direct upload to S3 using presigned POST URLs
- Copy and share links to your cloud-stored documents

## Architecture

This application is designed to run entirely client-side after being exported as a static site. It uses:

- React for the UI components
- Next.js for the build pipeline
- pdf-lib for PDF manipulation
- qrcode.react for QR code generation
- Unauthenticated AWS API Gateway endpoint to obtain presigned POST URLs
- Direct browser-to-S3 upload using presigned POST

## Getting Started

First, set up your environment:

1. Copy `.env.local.example` to `.env.local` and add your API Gateway endpoint URL:

   ```
   NEXT_PUBLIC_API_ENDPOINT="https://your-api-gateway-url.amazonaws.com/generate-upload-url"
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Run the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to use the application.

## Building for Production

To create a static export for hosting:

```bash
npm run build
# or
yarn build
```

The static files will be generated in the `out` directory, ready to be deployed to any static hosting service.

## Backend Requirements

This application requires a backend service that provides:

1. An API Gateway endpoint that returns presigned S3 POST URLs
2. An S3 bucket configured with CORS and appropriate public read access
3. Optional but recommended: CloudFront distribution for serving the PDFs

For security, the API endpoint should be protected by a WAF with rate limiting.

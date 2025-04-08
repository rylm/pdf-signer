# Refactoring Plan: PDF Signer v0.2 - QR Code Stamping with S3 (SSG Client Focus)

## 1. Goal

Refactor the existing client-side React PDF signer application (exported via Next.js SSG) to remove cryptographic signing. Instead, the app will:

1.  After PDF selection, call an external, unauthenticated API endpoint (API Gateway + Lambda) to get S3 presigned POST details and the final object URL.
2.  Generate a QR code representing the final S3 object URL.
3.  Allow the user to visually place this QR code onto the PDF preview.
4.  Embed the QR code image onto the original PDF using client-side libraries.
5.  Upload the modified (QR-stamped) PDF directly from the client's browser to S3 using the received presigned POST URL.
6.  Confirm the upload success and display the final S3 URL.

**Key Constraints:**

- The React application runs entirely client-side (browser) after static export.
- No secrets are stored in the client-side code. The API Gateway endpoint URL is publicly accessible.
- The API endpoint is unauthenticated from the client's perspective (protected by WAF IP rate-limiting on the backend).

## 2. High-Level Plan & Architecture

1.  **Frontend (React App - Runs in Browser):**
    - Removes all Ed25519 keypair and cryptographic signing logic.
    - Adds logic to make an **unauthenticated `POST` request** to the predefined API Gateway endpoint.
    - Integrates a QR code generation library.
    - Modifies the UI to allow placement of the generated QR code.
    - Uses `pdf-lib` to embed the QR code image onto the PDF.
    - Implements client-side S3 upload using `fetch` and `FormData` with the presigned POST data.
    - Updates the user workflow and UI components (Stepper, status indicators).
2.  **Backend (External Service - AWS):**
    - **API Gateway (HTTP API):** Provides a public, unauthenticated endpoint (e.g., `POST /generate-upload-url`). Protected by WAF for rate-limiting.
    - **Lambda Function:** Triggered by API Gateway. Generates a unique S3 object key, the presigned POST URL (`url` + `fields`), and the final public object URL. Returns these to the client. Requires no input parameters from the client request body.
    - **S3 Bucket:** Configured with CORS to accept `POST` requests from the web app's origin. Stores the final QR-stamped PDFs. Configured for public read access (either directly or via CloudFront).
    - **IAM Role:** Grants Lambda necessary permissions for `s3:PutObject` via presigned POST generation.
    - **(Infrastructure) WAF:** Rate-limits the API Gateway endpoint based on IP address.
    - **(Infrastructure) CloudFront:** (Optional) Serves S3 content efficiently and securely.

## 3. Detailed Frontend Changes (React App - `src/`)

- **Configuration:**

  - Store the **API Gateway invocation URL** in a configuration file or environment variable accessible during the build process (e.g., `.env.local` used by Next.js `NEXT_PUBLIC_` variables). This URL is _not_ a secret. Example: `NEXT_PUBLIC_API_ENDPOINT="https://yourapi.execute-api.us-east-1.amazonaws.com/generate-upload-url"`

- **`src/app/page.tsx`:**

  - **State:**
    - Remove: `privateKey`, `publicKey`, `keypairValid`, `pdfSigned`, `signatureMetadata`, `signedPdfBytesRef`, `signedPdfUrl`, `isSigningPdf`.
    - Keep/Adapt: `pdfFile` (original uploaded File object), `currentStep`, `error`.
    - Add:
      - `isFetchingUrl`: boolean (for API call loading state).
      - `presignedPostData`: `{ url: string; fields: Record<string, string> } | null`.
      - `finalS3Url`: `string | null` (URL for the QR code and final confirmation).
      - `stampedPdfBytes`: `Uint8Array | null` (PDF bytes _with_ QR code embedded).
      - `stampedPdfPreviewUrl`: `string | null` (Blob URL for previewing the stamped PDF, optional).
      - `isUploading`: boolean.
      - `uploadProgress`: number (0-100).
      - `uploadError`: `string | null`.
      - `uploadComplete`: boolean.
  - **Workflow Functions:**
    - `handlePdfUpload`: Remains similar, sets `pdfFile`, resets subsequent steps. Triggers `fetchPresignedUrl` upon successful upload.
    - `fetchPresignedUrl`: (New function)
      - Triggered after `pdfFile` is set.
      - Sets `isFetchingUrl = true`, clears previous S3/upload state.
      - Makes a `POST` request (no body needed) to `process.env.NEXT_PUBLIC_API_ENDPOINT`.
      - Handles the response: sets `presignedPostData` and `finalS3Url` on success, sets `error` on failure.
      - Sets `isFetchingUrl = false`.
      - Advances `currentStep` if successful.
    - `handleQrCodePlacement`: (Replaces `handleStampPlacement`)
      - Triggered by `PdfPreview`'s `onStampPlaced` callback. Receives position (`x`, `y`, `page`) and QR code image data (`stampImage`: base64 PNG string).
      - Calls a utility function (e.g., `addQrCodeToPdf` in `pdf-utils.ts`) using the _original_ `pdfFile` bytes and the received QR code details.
      - Sets `stampedPdfBytes` with the result.
      - Optionally generates `stampedPdfPreviewUrl` from `stampedPdfBytes` for preview.
      - Sets `currentStep` to the upload/final step.
    - `handleUploadToS3`: (New function, replaces download logic)
      - Triggered in the final step.
      - Sets `isUploading = true`, `uploadProgress = 0`, `uploadError = null`, `uploadComplete = false`.
      - Creates a `FormData` object.
      - Appends all `fields` from `presignedPostData.fields` to the `FormData`.
      - Appends the `stampedPdfBytes` as the `file` field (the key 'file' must match the last field specified in the presigned POST policy fields). Ensure correct Blob/File object creation with MIME type 'application/pdf'.
      - Uses `fetch` or `axios` to `POST` the `FormData` to `presignedPostData.url`.
      - Implement progress tracking using `XMLHttpRequest` if `fetch` doesn't suffice, or use `axios`'s `onUploadProgress`.
      - On success (HTTP 200 or 204 usually), sets `isUploading = false`, `uploadComplete = true`, `uploadProgress = 100`.
      - On error, sets `isUploading = false`, sets `uploadError`.
  - **UI Elements/Components:**
    - Update `<Stepper>`: e.g., "1. Upload PDF", "2. Place QR Code", "3. Upload & Finish". Remove the keypair step.
    - Remove `KeypairInput`.
    - Remove `MetadataDisplay` or replace it with a component showing upload status/progress and the final S3 link.
    - Pass `finalS3Url` to `PdfPreview` for QR code generation.
    - Pass `pdfFile` (or its derived URL) to `PdfPreview` initially. Optionally pass `stampedPdfPreviewUrl` after QR placement if implementing preview of the stamped version.
    - Update button states/text: "Upload PDF" -> (API Call Loading) -> "Place QR Code" -> (Stamping) -> "Upload to Cloud" -> (Uploading Progress) -> "Upload Complete / Copy Link".
    - Add UI indicators for API call loading (`isFetchingUrl`), upload progress (`uploadProgress`), and final success (`uploadComplete`) or error (`uploadError`).

- **`src/components/keypair-input.tsx`:** Delete.
- **`src/components/metadata-display.tsx`:** Delete or repurpose for upload status/link display.

- **`src/components/pdf-preview.tsx`:**

  - Remove props `isSigned`, `signatureMetadata`.
  - Add prop `qrCodeUrl: string | null` (this will be the `finalS3Url`).
  - Modify the "Stamp" rendering logic:
    - Conditionally render a `<QrCodeStamp>` component (see below) only when `qrCodeUrl` is available and placement is active.
    - Pass `qrCodeUrl` to `<QrCodeStamp>`.
  - Ensure `handleConfirmPlacement` captures the QR code image (e.g., using `html-to-image` on the `<QrCodeStamp>` component) and passes it back via `onStampPlaced` as `stampImage`.

- **`src/components/stamp.tsx`:** Delete.

- **`src/components/QrCodeStamp.tsx` (New Component):**

  - Accepts `url: string` prop.
  - Uses a QR code library (e.g., `qrcode.react`) to render a QR code for the given `url`.
  - Style appropriately (size, padding, border) so it looks like a stamp and is capturable.
  - Ensure it has a stable class name or ID for targeting by `html-to-image` if needed.

- **`src/lib/crypto.ts`:**

  - Remove all functions and interfaces related to Ed25519, signing, certificates.
  - Keep `fileToUint8Array` as it's needed to process the original upload. Remove other helpers if unused.

- **`src/lib/pdf-utils.ts`:**

  - Rename `addSignatureStampToPdf` to `addQrCodeToPdf`.
  - Remove the `metadata` parameter.
  - Ensure the `stampImage` parameter (base64 PNG string of the QR code) is correctly embedded using `pdfDoc.embedPng`. Adjust positioning/scaling logic if needed for QR code aspect ratio/size. Operates on the input `pdfBytes` (original PDF).

- **`package.json`:**
  - **Add:** `qrcode.react` (or similar QR library). Optional: `axios`.
  - **Remove:** `@noble/ed25519`, `pkijs`, `@signpdf/*`, `node-forge` (if only used for crypto).

## 4. Backend Requirements Summary (Context for Client Interaction)

- **Lambda:** Expects no input body. Generates unique key, presigned POST data (`url`, `fields` including `acl: public-read` if needed, `content-type: application/pdf`, `content-length-range`), and final public URL. Returns `{ presignedPostData: { url, fields }, finalUrl: string }`.
- **API Gateway:** `POST /generate-upload-url`, no auth, Lambda integration, CORS enabled for client origin.
- **S3:** CORS enabled for client origin (`POST`), public read access enabled.
- **IAM:** Lambda role allows `s3:PutObject` under presigned POST conditions.

## 5. Security Considerations (Client-Side Perspective)

- The API endpoint URL is public; security relies on WAF rate-limiting and the short expiry/strict conditions of the presigned POST URL generated by the Lambda.
- The client never handles AWS credentials.
- Input validation is minimal on the client (PDF type/size check before upload). The backend presigned policy enforces upload constraints (size, type).

## 6. New Workflow Summary (Client Perspective)

1.  User loads the static page.
2.  User selects a PDF (`PdfUpload`).
3.  Client converts PDF `File` to `Uint8Array` (`fileToUint8Array`).
4.  Client sends **unauthenticated `POST`** request to the known API Gateway endpoint (`NEXT_PUBLIC_API_ENDPOINT`).
5.  Client waits for API response, showing loading state.
6.  Client receives `{ presignedPostData, finalUrl }` or an error.
7.  Client uses `finalUrl` to generate a QR code image (`QrCodeStamp` + `qrcode.react`).
8.  User places the QR code visually on the PDF preview (`PdfPreview`).
9.  Client captures the QR code image (e.g., `html-to-image`).
10. Client uses `pdf-lib` (`addQrCodeToPdf`) to embed the captured QR code image onto the _original_ PDF `Uint8Array`, creating `stampedPdfBytes`.
11. Client constructs `FormData`, populates it with `presignedPostData.fields`, and adds `stampedPdfBytes` as the `file`.
12. Client `POST`s the `FormData` to `presignedPostData.url`, tracking progress.
13. Client displays success (showing/linking `finalUrl`) or error message.

This revised plan aligns with the SSG client-side nature and the unauthenticated API interaction model.

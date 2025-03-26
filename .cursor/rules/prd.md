**Product Requirements Document: Client-Side PDF Signer v0.1**

**1. Introduction**

This document outlines the requirements for a simple, client-side web application component enabling users to electronically sign PDF documents. The component allows users to provide an Ed25519 keypair (or generate one), upload a PDF, apply a cryptographic signature using a self-signed certificate, visually place a stamp containing signature metadata onto the document, and download the modified PDF. All operations must occur entirely within the user's browser, leveraging JavaScript libraries. This component is intended to be integrated as a route within a larger Next.js application.

**2. Goals**

- Allow users to provide or generate an Ed25519 keypair.
- Enable users to upload a PDF document.
- Cryptographically sign the PDF document using the provided private key and a generated self-signed certificate.
- Generate and display relevant signature metadata.
- Allow users to visually place a stamp containing metadata onto a preview of the PDF.
- Provide the user with a downloadable version of the PDF containing both the embedded cryptographic signature and the visual stamp overlay.
- Ensure the entire process runs client-side using Next.js, Tailwind CSS, and shadcn/ui.

**3. Non-Goals**

- Server-side processing or storage of keys or documents.
- User authentication or management (handled by the parent application).
- Support for key types other than Ed25519 (in v0.1).
- Validation of existing signatures on uploaded PDFs.
- Advanced PDF form filling or manipulation beyond adding a signature and stamp.
- Password-protected PDF decryption.
- Managing multiple signatures on a single document (in v0.1).
- Saving/managing user keypairs beyond the current session (unless generated keys are explicitly copied by the user).

**4. Target Audience**

Users of the parent application who need a simple way to apply a personal cryptographic signature and a visual stamp to a PDF document directly within their browser.

**5. Functional Requirements**

- **FR1: Keypair Input & Generation**

  - **FR1.1:** The UI must provide two distinct input fields for the user to paste their Ed25519 private key and public key in hexadecimal format.
  - **FR1.2:** Input validation should be performed to check if the provided strings are valid hexadecimal representations and potentially check for expected key length for Ed25519. Clear error messages should be shown for invalid input.
  - **FR1.3:** A "Generate Keypair" button must be provided. Clicking this button shall generate a new Ed25519 keypair client-side.
  - **FR1.4:** Upon generation, the new public and private keys (in hex format) must automatically populate the respective input fields.
  - **FR1.5:** The component must support receiving pre-filled keypair values (e.g., via route parameters or props) for integration purposes.

- **FR2: PDF Upload**

  - **FR2.1:** A UI element (e.g., a button or drag-and-drop area) must allow the user to select and upload a PDF file from their local system.
  - **FR2.2:** The PDF file must be loaded and processed entirely client-side.
  - **FR2.3:** Basic validation should check if the uploaded file is a PDF. Display an error if not.
  - **FR2.4:** Display loading indicators during file upload and initial processing.

- **FR3: PDF Rendering & Preview**

  - **FR3.1:** Once a PDF is successfully uploaded, the first page (or potentially multiple pages, TBD based on complexity) must be rendered in a preview area within the UI.
  - **FR3.2:** This preview area will be used for placing the visual stamp (see FR7).

- **FR4: Cryptographic Signing**

  - **FR4.1:** Upon user action (e.g., clicking a "Sign Document" button after PDF upload and key input), the application must perform the cryptographic signing process.
  - **FR4.2:** Generate a basic, self-signed X.509 certificate structure containing the user's provided Ed25519 public key. Minimal required fields should be included (e.g., common name derived from public key, validity period).
  - **FR4.3:** Compute the digital signature of the PDF document content using the user's provided Ed25519 private key according to relevant standards (e.g., RFC 8037 for EdDSA).
  - **FR4.4:** Embed the computed signature and the self-signed certificate into the PDF structure, creating a PAdES-compliant (or similar standard) signature if possible within the chosen library's constraints. This should modify the PDF data structure internally but not necessarily visually at this stage.

- **FR5: Metadata Generation & Display**

  - **FR5.1:** After successful cryptographic signing (FR4), generate signature metadata.
  - **FR5.2:** Metadata must include at minimum:
    - Timestamp of signing (ISO 8601 format).
    - Identifier based on the Public Key (e.g., truncated hex string).
    - Identifier based on the Signature (e.g., truncated hash of the signature).
    - _(Note: Specific content can be refined during implementation)_
  - **FR5.3:** Display this generated metadata clearly in a dedicated panel or section of the UI, visible _before_ the user places the visual stamp.

- **FR6: Visual Stamp Creation**

  - **FR6.1:** Based on the generated metadata (FR5), create a visual stamp element.
  - **FR6.2:** The stamp must appear as a rectangular box containing text representations of selected metadata items (e.g., "Signed on: [Timestamp]\nBy Key: [PubKey Identifier]"). The exact layout and content are flexible.

- **FR7: Stamp Placement**

  - **FR7.1:** The user must be able to interact with the PDF preview area (FR3) to place the visual stamp (FR6).
  - **FR7.2:** The interaction should allow the user to click (or drag-and-drop) the stamp onto the desired location on the PDF page preview.
  - **FR7.3:** The UI should provide visual feedback showing where the stamp will be placed. The ability to resize the stamp is optional for v0.1.

- **FR8: Final PDF Modification**

  - **FR8.1:** Once the user confirms the stamp placement (e.g., via a "Confirm Placement" or implicitly via the Download button), the application must modify the PDF.
  - **FR8.2:** Using a PDF manipulation library, add the visual stamp (FR6) as a new overlay or annotation onto the target page(s) at the user-selected coordinates (FR7).
  - **FR8.3:** This modification should be applied to the _already cryptographically signed_ PDF data (from FR4). The output should be a single PDF containing both the embedded digital signature and the visible stamp.

- **FR9: Download Signed PDF**
  - **FR9.1:** Provide a "Download Signed PDF" button, enabled only after successful signing and stamp placement.
  - **FR9.2:** Clicking this button initiates a client-side download of the final modified PDF document (FR8).
  - **FR9.3:** The downloaded filename should be derived from the original filename, appended with a suffix like "-signed" (e.g., `mydocument-signed.pdf`).

**6. User Interface & User Experience (UI/UX)**

- **Layout:** A clean, step-by-step interface. Potential layout includes sections/cards for:
  1.  Keypair Input (with Generate button).
  2.  PDF Upload Area.
  3.  Main Content Area: Displays PDF Preview and interactive elements.
  4.  Metadata Panel: Displays details after signing.
  5.  Action Buttons (Generate Keys, Upload, Sign, Download).
- **Component Library:** Utilize `shadcn/ui` components (`Input`, `Button`, `Card`, `Alert` for errors, etc.) for consistency with the parent application and rapid development.
- **Workflow:**
  1.  User lands on the page. Keypair fields are visible (potentially pre-filled). "Generate Keypair" button is available.
  2.  User inputs/generates keys. Validation occurs on input change or blur.
  3.  User uploads a PDF. A loading indicator is shown. Upon success, the PDF preview is displayed.
  4.  A "Sign Document" button becomes active once keys are valid and PDF is loaded.
  5.  User clicks "Sign Document". A loading/processing state is shown.
  6.  Upon successful signing:
      - The Metadata Panel is populated.
      - The visual stamp preview appears (perhaps draggable from the metadata panel or appearing directly on the PDF preview).
      - The PDF preview becomes interactive for stamp placement.
  7.  User drags/clicks to place the stamp on the PDF preview.
  8.  The "Download Signed PDF" button becomes active.
  9.  User clicks "Download". The browser prompts to save the final PDF.
- **Feedback & Error Handling:**
  - Provide clear visual feedback for loading states (file upload, signing process).
  - Display user-friendly error messages for: invalid key format, non-PDF file upload, PDF parsing errors, signing failures, etc. (e.g., using `shadcn/ui` Alerts).
  - Clearly indicate the current state of the process (e.g., "Upload PDF", "Place Stamp", "Ready to Download").

**7. Technical Requirements**

- **Framework:** Next.js (>= 13.x, App Router preferred).
- **Styling:** Tailwind CSS.
- **UI Components:** shadcn/ui.
- **Language:** TypeScript.
- **Core Logic:** All signing, PDF manipulation, and key generation must execute client-side in the browser.
- **PDF Manipulation Library:** `pdf-lib` is recommended due to its capabilities in modifying PDFs, adding annotations/overlays, and support (or potential for support) for embedding digital signatures. Research needed to confirm ease of Ed25519 and self-signed certificate integration.
- **Cryptography Library:** A modern, well-maintained library for Ed25519 key generation and signing (e.g., `@noble/ed25519` or similar). The Web Crypto API should be used where feasible, but external libraries will likely be needed for Ed25519 and certificate generation.
- **Certificate Generation:** A minimal library like `pkijs` or potentially a custom-built function to generate the necessary ASN.1 structure for a basic self-signed X.509 certificate compatible with PDF signing standards.
- **PDF Rendering:** A library like `react-pdf` (which uses PDF.js) or rendering pages directly to a `<canvas>` using `pdf-lib` for the interactive preview.
- **Deployment:** The component must be compatible with Static Site Generation (SSG) via `next build && next export` (or default static export behavior in newer Next.js versions).

**8. Data Model / Metadata Details**

- **Input Data:**
  - `privateKeyHex`: String (Hexadecimal representation of Ed25519 private key).
  - `publicKeyHex`: String (Hexadecimal representation of Ed25519 public key).
  - `uploadedPdf`: File object / ArrayBuffer.
- **Intermediate Data:**
  - `pdfDoc`: Internal representation of the PDF document (e.g., `pdf-lib` object).
  - `selfSignedCert`: Data structure representing the generated certificate (e.g., DER bytes).
  - `signature`: Byte array or Hex string of the computed digital signature.
- **Metadata (Example - Subject to Refinement):**
  - `timestamp`: String (ISO 8601 Format, e.g., `2023-10-27T10:30:00Z`).
  - `publicKeyId`: String (e.g., `0xABCDEF...123456`).
  - `signatureId`: String (e.g., `SHA256:[Hash Digest Hex]`).
- **Output Data:**
  - `signedStampedPdf`: ArrayBuffer or Blob of the final PDF document.

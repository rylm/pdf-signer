import { PDFDocument } from 'pdf-lib';
import { SignatureMetadata } from './crypto';

interface StampPosition {
  x: number;
  y: number;
  page: number;
}

/**
 * Adds a visual signature stamp to a PDF document.
 *
 * @param pdfBytes The PDF document as Uint8Array.
 * @param metadata The signature metadata to display in the stamp.
 * @param position The position of the stamp on the page.
 * @param stampImage PNG image data as string (data URL).
 * @returns A Promise that resolves with the modified PDF as Uint8Array.
 */
export async function addSignatureStampToPdf(
  pdfBytes: Uint8Array,
  metadata: SignatureMetadata,
  position: StampPosition,
  stampImage: string
): Promise<Uint8Array> {
  // Load the PDF document
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Get the specified page (default to first page if invalid)
  const pages = pdfDoc.getPages();
  const pageIndex =
    position.page >= 0 && position.page < pages.length ? position.page : 0;
  const page = pages[pageIndex];

  // Get PDF page dimensions
  const { width, height } = page.getSize();

  console.log('Processing PNG stamp image...');
  const base64Data = stampImage.split(',')[1];

  // Convert base64 to binary
  const binaryString = window.atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  console.log(`Image data size: ${bytes.length} bytes`);

  // Embed the image in the PDF
  const pngImage = await pdfDoc.embedPng(bytes);

  // Get original image dimensions
  const imgWidth = pngImage.width;
  const imgHeight = pngImage.height;
  console.log(`Original image dimensions: ${imgWidth}x${imgHeight}`);

  // Calculate target size - maintain exact aspect ratio
  const targetWidth = 180; // Target width in points (PDF units)
  const scale = targetWidth / imgWidth;
  const targetHeight = imgHeight * scale;

  console.log(
    `Scaled dimensions: ${targetWidth}x${targetHeight} (scale: ${scale})`
  );

  // Convert position from screen coordinates to PDF coordinates
  const pdfX = position.x;
  const pdfY = height - position.y;

  // Calculate stamp position (centered on the provided coordinates)
  const topLeftX = pdfX - targetWidth / 2;
  const topLeftY = pdfY - targetHeight / 2;

  // Constrain to page boundaries
  const finalX = Math.max(0, Math.min(topLeftX, width - targetWidth));
  const finalY = Math.max(0, Math.min(topLeftY, height - targetHeight));

  console.log(
    `Final placement at (${finalX}, ${finalY}) with size ${targetWidth}x${targetHeight}`
  );

  // Draw the image onto the page
  page.drawImage(pngImage, {
    x: finalX,
    y: finalY,
    width: targetWidth,
    height: targetHeight,
  });

  console.log('Image successfully embedded in PDF');

  // Return the modified PDF
  return await pdfDoc.save();
}

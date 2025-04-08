import { PDFDocument } from 'pdf-lib';

interface StampPosition {
  x: number;
  y: number;
  page: number;
}

/**
 * Adds a QR code image to a PDF document.
 *
 * @param pdfBytes The PDF document as Uint8Array.
 * @param position The position of the QR code on the page (center point).
 * @param stampImage PNG image data as string (data URL).
 * @returns A Promise that resolves with the modified PDF as Uint8Array.
 */
export async function addQrCodeToPdf(
  pdfBytes: Uint8Array,
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

  console.log('Processing QR code image...');
  console.log(
    `Unscaled coordinates from preview: (${position.x.toFixed(
      2
    )}, ${position.y.toFixed(2)}) on page ${pageIndex}`
  );
  console.log(`PDF page dimensions: ${width}x${height}`);

  // The position coordinates are already in PDF user space,
  // relative to the PDF page's top-left corner (unscaled)

  // In PDF, the origin (0,0) is at the bottom-left,
  // so we need to flip the Y coordinate
  const pdfX = position.x;
  const pdfY = height - position.y; // Flip Y axis

  console.log(
    `Transformed PDF coordinates (center): (${pdfX.toFixed(2)}, ${pdfY.toFixed(
      2
    )})`
  );

  // Process the image data
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

  // Calculate top-left position for the image (centered on click coordinates)
  const topLeftX = pdfX - targetWidth / 2;
  const topLeftY = pdfY - targetHeight / 2;

  console.log(
    `Top-left coordinates (after centering): (${topLeftX.toFixed(
      2
    )}, ${topLeftY.toFixed(2)})`
  );

  // Constrain to page boundaries
  const finalX = Math.max(0, Math.min(topLeftX, width - targetWidth));
  const finalY = Math.max(0, Math.min(topLeftY, height - targetHeight));

  // Log if position was adjusted due to page boundaries
  if (finalX !== topLeftX || finalY !== topLeftY) {
    console.log(`Position adjusted to fit within page boundaries`);
    console.log(
      `Final position after adjustment: (${finalX.toFixed(2)}, ${finalY.toFixed(
        2
      )})`
    );
  }

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

'use client';

import { Document, Page, pdfjs } from 'react-pdf';

// Set the worker source for PDF.js located in public
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface PDFViewerProps {
  file: File | string | null;
  pageNumber: number;
  scale: number;
  onLoadSuccess: ({ numPages }: { numPages: number }) => void;
  onLoadError: (error: Error) => void;
}

export function PDFViewer({
  file,
  pageNumber,
  scale,
  onLoadSuccess,
  onLoadError,
}: PDFViewerProps) {
  if (!file) return null;

  return (
    <Document
      file={file}
      onLoadSuccess={onLoadSuccess}
      onLoadError={onLoadError}
      loading={null}
    >
      <Page
        pageNumber={pageNumber}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        scale={scale}
      />
    </Document>
  );
}

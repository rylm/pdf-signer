'use client';

import { Document, Page, pdfjs } from 'react-pdf';

// Set the worker source for PDF.js located in public
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

// Define a type for page dimensions
export interface PDFPageInfo {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

interface PDFViewerProps {
  file: File | string | null;
  pageNumber: number;
  scale: number;
  onLoadSuccess: ({ numPages }: { numPages: number }) => void;
  onLoadError: (error: Error) => void;
  onPageLoadSuccess?: (page: PDFPageInfo) => void;
}

export function PDFViewer({
  file,
  pageNumber,
  scale,
  onLoadSuccess,
  onLoadError,
  onPageLoadSuccess,
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
        onLoadSuccess={onPageLoadSuccess}
      />
    </Document>
  );
}

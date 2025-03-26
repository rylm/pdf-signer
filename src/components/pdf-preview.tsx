'use client';

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stamp } from '@/components/stamp';
import { SignatureMetadata } from '@/lib/crypto';
import * as htmlToImage from 'html-to-image';
import {
  ZoomIn,
  ZoomOut,
  Info,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileWarning,
} from 'lucide-react';

// Define the interface for the PDF viewer component
interface PDFViewerProps {
  file: File | string | null;
  pageNumber: number;
  scale: number;
  onLoadSuccess: ({ numPages }: { numPages: number }) => void;
  onLoadError: (error: Error) => void;
}

// Dynamically import react-pdf components with no SSR
const PDFViewer = dynamic<PDFViewerProps>(
  () => import('./pdf-viewer').then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Loading PDF viewer...</p>
      </div>
    ),
  }
);

interface PdfPreviewProps {
  isSigned: boolean;
  onStampPlaced: (position: {
    x: number;
    y: number;
    page?: number;
    stampImage?: string;
  }) => void;
  pdfFile: File | null;
  pdfUrl?: string;
  signatureMetadata?: SignatureMetadata;
}

export default function PdfPreview({
  isSigned,
  onStampPlaced,
  pdfFile,
  pdfUrl,
  signatureMetadata,
}: PdfPreviewProps) {
  const [scale, setScale] = useState(1);
  const [stampPosition, setStampPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isDraggingStamp, setIsDraggingStamp] = useState(false);
  const [isPlacingStamp, setIsPlacingStamp] = useState(false);
  const [isStampPlaced, setIsStampPlaced] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(
    null
  );
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSigned && !isStampPlaced) {
      setIsPlacingStamp(true);
    }
  }, [isSigned, isStampPlaced]);

  // Reset page number when changing files or URLs
  useEffect(() => {
    setPageNumber(1);
    setPdfError(null);
  }, [pdfFile, pdfUrl]);

  // Update loading initialization for both file and URL
  useEffect(() => {
    if (pdfFile || pdfUrl) {
      setIsLoading(true);
    }
  }, [pdfFile, pdfUrl]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handlePreviousPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    if (numPages) {
      setPageNumber((prev) => Math.min(prev + 1, numPages));
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setPdfError(
      'Failed to load the PDF document. The file may be corrupted or invalid.'
    );
    setIsLoading(false);
  };

  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacingStamp || isStampPlaced || isDraggingStamp) return;

    // Get the bounding rectangle of the preview container
    const previewRect = previewRef.current?.getBoundingClientRect();
    if (!previewRect) return;

    // Calculate the clicked position relative to the preview container,
    // taking into account the current scale
    const x = (e.clientX - previewRect.left) / scale;
    const y = (e.clientY - previewRect.top) / scale;

    console.log(`Setting initial stamp position: (${x}, ${y})`);
    setStampPosition({ x, y });
    setIsStampPlaced(true);
  };

  const handleStampMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isStampPlaced || !stampRef.current) return;

    e.stopPropagation();
    e.preventDefault();
    setIsDraggingStamp(true);

    // Get the stamp element's position and size
    const stampRect = stampRef.current.getBoundingClientRect();
    // Calculate the center of the stamp
    const stampCenterX = stampRect.left + stampRect.width / 2;
    const stampCenterY = stampRect.top + stampRect.height / 2;

    // Calculate offsets from the mouse position to the center of the stamp
    const offsetX = e.clientX - stampCenterX;
    const offsetY = e.clientY - stampCenterY;

    console.log(`Drag started. Offset from center: (${offsetX}, ${offsetY})`);
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingStamp || !dragOffset || !previewRef.current) return;

    // Get the preview container's position
    const previewRect = previewRef.current.getBoundingClientRect();

    // Calculate the new position, accounting for:
    // 1. The offset from the mouse to the center of the stamp
    // 2. The position of the preview container
    // 3. The current scale
    const newX = (e.clientX - dragOffset.x - previewRect.left) / scale;
    const newY = (e.clientY - dragOffset.y - previewRect.top) / scale;

    console.log(`Dragging to: (${newX}, ${newY})`);
    setStampPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    if (isDraggingStamp) {
      setIsDraggingStamp(false);
      setDragOffset(null);
    }
  };

  const handleConfirmPlacement = async () => {
    if (!stampPosition || !stampRef.current || !previewRef.current) return;

    // Find the stamp component
    const stampComponent = stampRef.current.querySelector('.stamp-component');

    if (!stampComponent) {
      console.error('Could not find stamp component');
      return;
    }

    console.log('Capturing stamp as PNG...');

    // Make sure all styles are included and computed correctly
    const stampOptions = {
      quality: 1,
      pixelRatio: 4,
      width: 180,
      height: 100, // Increased height to ensure all content is visible
      skipAutoScale: true,
      fontEmbedCSS: document.querySelector('style')?.innerHTML || '',
      includeQuerySelector: true,
      style: {
        padding: '12px',
        borderRadius: '8px',
        background: '#eff6ff',
        border: '2px solid #3b82f6',
        boxSizing: 'border-box',
      },
    };

    try {
      // Capture the stamp component as PNG with higher quality
      const pngImage = await htmlToImage.toPng(
        stampComponent as HTMLElement,
        stampOptions
      );

      console.log('Stamp captured successfully as PNG');

      // Call onStampPlaced with position and PNG data
      onStampPlaced({
        x: stampPosition.x,
        y: stampPosition.y,
        page: pageNumber - 1, // Adjust for zero-based indexing
        stampImage: pngImage,
      });

      // Hide the stamp component after placing
      setStampPosition(null);
      setIsPlacingStamp(false);
      setIsStampPlaced(true);
    } catch (error) {
      console.error('Failed to capture stamp:', error);
    }
  };

  const handleResetPlacement = () => {
    setStampPosition(null);
    setIsStampPlaced(false);
    setIsPlacingStamp(true);
    // No need to call onStampPlaced here since we're resetting
  };

  return (
    <Card className="overflow-hidden py-0">
      <div className="bg-muted p-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>

          {numPages && numPages > 1 && (
            <div className="flex items-center ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousPage}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm mx-2">
                {pageNumber} / {numPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextPage}
                disabled={pageNumber >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {isPlacingStamp && (
          <div className="flex items-center gap-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Info className="h-4 w-4 mr-1" />
              {isStampPlaced
                ? 'Drag to adjust position'
                : 'Click to place stamp'}
            </div>
            {isStampPlaced && (
              <>
                <Button size="sm" onClick={handleConfirmPlacement}>
                  Confirm Placement
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetPlacement}
                >
                  Reset
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div
        className="relative overflow-auto bg-gray-100 dark:bg-gray-800 h-[600px] flex items-center justify-center"
        ref={previewRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {pdfFile || pdfUrl ? (
          <>
            {isLoading && !pdfError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            )}
            {pdfError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <FileWarning className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-medium mb-2">Error Loading PDF</h3>
                <p className="text-sm text-muted-foreground">{pdfError}</p>
              </div>
            ) : (
              <div
                className="relative bg-white dark:bg-gray-700 shadow-lg"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'center',
                  cursor:
                    isPlacingStamp && !isStampPlaced ? 'crosshair' : 'default',
                }}
                onClick={handlePreviewClick}
              >
                <PDFViewer
                  file={pdfUrl || pdfFile}
                  pageNumber={pageNumber}
                  scale={scale}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                />

                {/* Stamp overlay */}
                {stampPosition && (
                  <div
                    ref={stampRef}
                    className="absolute"
                    style={{
                      left: `${stampPosition.x}px`,
                      top: `${stampPosition.y}px`,
                      transform: 'translate(-50%, -50%)',
                      userSelect: 'none',
                      touchAction: 'none',
                      zIndex: 10,
                      cursor: isPlacingStamp ? 'move' : 'default',
                      background: 'transparent',
                      padding: 0,
                      margin: 0,
                    }}
                    onMouseDown={handleStampMouseDown}
                  >
                    <Stamp metadata={signatureMetadata} />
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-muted-foreground">
              No PDF file uploaded. Please upload a PDF in the previous step.
            </p>
          </div>
        )}

        {isPlacingStamp && !isStampPlaced && (
          <div className="absolute inset-0 bg-black/10 z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg text-center max-w-md">
              <Info className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-medium mb-1">
                Place Your Signature Stamp
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Click anywhere on the document to place your signature stamp.
                You&apos;ll be able to adjust or reset the position before
                confirming.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

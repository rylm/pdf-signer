'use client';

import type React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QRCodeStamp } from '@/components/qr-code-stamp';
import * as htmlToImage from 'html-to-image';
import {
  ZoomIn,
  ZoomOut,
  Info,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileWarning,
  RefreshCw,
} from 'lucide-react';
import { PDFPageInfo } from './pdf-viewer';

// Define the interface for the PDF viewer component
interface PDFViewerProps {
  file: File | string | null;
  pageNumber: number;
  scale: number;
  onLoadSuccess: ({ numPages }: { numPages: number }) => void;
  onLoadError: (error: Error) => void;
  onPageLoadSuccess?: (page: PDFPageInfo) => void;
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
  onStampPlaced: (position: {
    x: number;
    y: number;
    page?: number;
    stampImage?: string;
  }) => void;
  pdfFile: File | null;
  pdfUrl?: string;
  qrCodeUrl: string | null;
  isPlacementComplete?: boolean;
  onResetPlacement?: () => void;
}

// Define or update the StampPosition interface to include page
interface StampPosition {
  x: number;
  y: number;
  page: number;
}

export default function PdfPreview({
  onStampPlaced,
  pdfFile,
  pdfUrl,
  qrCodeUrl,
  isPlacementComplete = false,
  onResetPlacement,
}: PdfPreviewProps) {
  const [scale, setScale] = useState(1);
  const [stampPosition, setStampPosition] = useState<StampPosition | null>(
    null
  );
  const [isDraggingStamp, setIsDraggingStamp] = useState(false);
  const [isPlacingStamp, setIsPlacingStamp] = useState(false);
  const [isStampPlaced, setIsStampPlaced] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(
    null
  );
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Add state for PDF dimensions
  const [pdfDimensions, setPdfDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const pdfWrapperRef = useRef<HTMLDivElement>(null); // Ref for the new wrapper

  // Watch the isPlacementComplete prop to sync with internal state
  useEffect(() => {
    setIsStampPlaced(isPlacementComplete);
  }, [isPlacementComplete]);

  useEffect(() => {
    // If we have a QR code URL and not in placement mode, start placing
    if (qrCodeUrl && !isStampPlaced) {
      setIsPlacingStamp(true);
    }
  }, [qrCodeUrl, isStampPlaced]);

  // Reset page number when changing files or URLs
  useEffect(() => {
    setPageNumber(1);
    setPdfError(null);
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
  };

  // Update the handlePageLoadSuccess function
  const handlePageLoadSuccess = useCallback((page: PDFPageInfo) => {
    setPdfDimensions({ width: page.width, height: page.height });
  }, []);

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setPdfError(
      'Failed to load the PDF document. The file may be corrupted or invalid.'
    );
  };

  // Helper function to calculate coordinates relative to PDF wrapper
  const getCoordsRelativeToPdf = (
    e: React.MouseEvent<HTMLDivElement>
  ): { x: number; y: number } | null => {
    const wrapperElement = pdfWrapperRef.current;
    if (!wrapperElement || !pdfDimensions) {
      console.error('PDF Wrapper or dimensions not available');
      return null;
    }
    const wrapperRect = wrapperElement.getBoundingClientRect();

    // Click relative to the wrapper's top-left corner
    const clickXOnWrapper = e.clientX - wrapperRect.left;
    const clickYOnWrapper = e.clientY - wrapperRect.top;

    // Convert to unscaled coordinates (relative to PDF page top-left)
    const unscaledX = clickXOnWrapper / scale;
    const unscaledY = clickYOnWrapper / scale;

    console.log(
      `Unscaled position: (${unscaledX.toFixed(2)}, ${unscaledY.toFixed(2)})`
    );

    return { x: unscaledX, y: unscaledY };
  };

  // Updated handlePreviewClick
  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacingStamp || isStampPlaced || isDraggingStamp) return;

    const coords = getCoordsRelativeToPdf(e);
    if (!coords) return;

    setStampPosition({
      x: coords.x,
      y: coords.y,
      page: pageNumber - 1,
    });
    setIsStampPlaced(true);
  };

  // Updated handleStampMouseDown
  const handleStampMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isStampPlaced || !stampRef.current) return;
    e.stopPropagation();
    e.preventDefault();

    const stampRect = stampRef.current.getBoundingClientRect();
    const stampCenterX = stampRect.left + stampRect.width / 2;
    const stampCenterY = stampRect.top + stampRect.height / 2;
    const offsetX = e.clientX - stampCenterX;
    const offsetY = e.clientY - stampCenterY;

    console.log(`Stamp drag started`);

    setIsDraggingStamp(true);
    setDragOffset({ x: offsetX, y: offsetY });
  };

  // Updated handleMouseMove
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      !isDraggingStamp ||
      !dragOffset ||
      !pdfWrapperRef.current ||
      !stampPosition
    )
      return;

    const wrapperRect = pdfWrapperRef.current.getBoundingClientRect();

    // Target center in viewport coordinates
    const targetCenterXViewport = e.clientX - dragOffset.x;
    const targetCenterYViewport = e.clientY - dragOffset.y;

    // Convert to coordinates relative to the wrapper
    const targetCenterXOnWrapper = targetCenterXViewport - wrapperRect.left;
    const targetCenterYOnWrapper = targetCenterYViewport - wrapperRect.top;

    // Convert to unscaled coordinates
    const unscaledX = targetCenterXOnWrapper / scale;
    const unscaledY = targetCenterYOnWrapper / scale;

    setStampPosition({
      x: unscaledX,
      y: unscaledY,
      page: stampPosition.page,
    });
  };

  const handleMouseUp = () => {
    if (isDraggingStamp) {
      setIsDraggingStamp(false);
      setDragOffset(null);
    }
  };

  const handleConfirmPlacement = async () => {
    if (!stampPosition || !stampRef.current || !previewRef.current) return;

    console.log('Capturing QR code...');

    // Make sure all styles are included and computed correctly
    const stampOptions = {
      quality: 1,
      pixelRatio: 4,
      width: 180,
      height: 200, // Increased height to accommodate padding
      skipAutoScale: true,
      fontEmbedCSS: document.querySelector('style')?.innerHTML || '',
      includeQuerySelector: true,
      style: {
        padding: '12px',
        paddingBottom: '24px', // Significantly increased bottom padding
        borderRadius: '8px',
        background: '#eff6ff',
        border: '2px solid #3b82f6',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      },
    };

    try {
      // Use the stamp element directly to ensure all styles are captured
      const stampElement = stampRef.current.querySelector('.stamp-component');

      if (!stampElement) {
        console.error('Could not find stamp component');
        return;
      }

      // Capture the stamp component as PNG with higher quality
      const pngImage = await htmlToImage.toPng(
        stampElement as HTMLElement,
        stampOptions
      );

      console.log('QR code captured successfully');

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
    } catch (error) {
      console.error('Failed to capture QR code:', error);
    }
  };

  const handleResetPlacement = () => {
    setStampPosition(null);
    setIsStampPlaced(false);
    setIsPlacingStamp(true);

    // Call the parent's reset function if provided
    if (onResetPlacement) {
      onResetPlacement();
    }
  };

  return (
    <Card className="p-1 h-full flex flex-col bg-background border shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 mb-1">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            aria-label="Zoom out"
            disabled={scale <= 0.5}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            aria-label="Zoom in"
            disabled={scale >= 2}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>

          {numPages && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={pageNumber <= 1}
                onClick={handlePreviousPage}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {pageNumber} / {numPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={!numPages || pageNumber >= numPages}
                onClick={handleNextPage}
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {isPlacingStamp && (
          <div className="flex gap-2 ml-auto">
            {isStampPlaced ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetPlacement}
                  className="text-xs whitespace-nowrap"
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmPlacement}
                  className="text-xs whitespace-nowrap"
                >
                  Confirm
                </Button>
              </>
            ) : (
              <div className="text-xs text-muted-foreground flex items-center">
                <Info className="h-3 w-3 mr-1" />
                Click on the document to place the QR code
              </div>
            )}
          </div>
        )}

        {/* Add reposition button when placement is complete but we're not in placing mode */}
        {isPlacementComplete && !isPlacingStamp && (
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetPlacement}
              className="text-xs whitespace-nowrap"
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Reposition QR Code
            </Button>
          </div>
        )}
      </div>

      <div
        ref={previewRef}
        className={`flex-1 overflow-auto relative flex justify-center items-center ${
          isPlacingStamp && !isStampPlaced ? 'cursor-cell' : ''
        }`}
        onClick={handlePreviewClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {pdfError ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <FileWarning className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">{pdfError}</p>
          </div>
        ) : (
          // New wrapper div for positioning context
          <div
            ref={pdfWrapperRef}
            className="pdf-render-wrapper"
            style={{
              position: 'relative', // Positioning context for the stamp
              width: pdfDimensions
                ? `${pdfDimensions.width * scale}px`
                : 'auto',
              height: pdfDimensions
                ? `${pdfDimensions.height * scale}px`
                : 'auto',
              overflow: 'visible', // Ensure stamp isn't clipped if slightly outside
            }}
          >
            <PDFViewer
              file={pdfUrl || pdfFile}
              pageNumber={pageNumber}
              scale={scale}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              onPageLoadSuccess={handlePageLoadSuccess}
            />

            {/* Stamp Rendering */}
            {isPlacingStamp && qrCodeUrl && stampPosition && (
              <div
                ref={stampRef}
                className={`absolute z-10 ${
                  isDraggingStamp ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                style={{
                  left: `${stampPosition.x * scale}px`, // Position relative to wrapper
                  top: `${stampPosition.y * scale}px`, // Position relative to wrapper
                  transform: `translate(-50%, -50%) scale(${scale})`, // Center and scale proportionally
                  transformOrigin: 'center center',
                }}
                onMouseDown={handleStampMouseDown}
              >
                <QRCodeStamp url={qrCodeUrl} />
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

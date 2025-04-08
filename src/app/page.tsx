'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stepper, Step } from '@/components/stepper';
import PdfUpload from '@/components/pdf-upload';
import PdfPreview from '@/components/pdf-preview';
import UploadStatus from '@/components/upload-status';
import {
  AlertCircle,
  Download,
  FileSignature,
  Moon,
  Sun,
  ArrowLeft,
  Loader2,
  CloudUpload,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTheme } from 'next-themes';
import { fileToUint8Array } from '@/lib/crypto';
import { addQrCodeToPdf } from '@/lib/pdf-utils';
import { fetchPresignedUrl, uploadToS3, PresignedPostData } from '@/lib/api';

export default function PDFSignerPage() {
  // Log the API endpoint from environment variable during development
  if (process.env.NODE_ENV === 'development') {
    console.log('API Endpoint:', process.env.NEXT_PUBLIC_API_ENDPOINT);
  }

  const [currentStep, setCurrentStep] = useState(0);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [stampPlaced, setStampPlaced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // New state variables for the refactored workflow
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [presignedPostData, setPresignedPostData] =
    useState<PresignedPostData | null>(null);
  const [finalS3Url, setFinalS3Url] = useState<string | null>(null);
  const [stampedPdfBytes, setStampedPdfBytes] = useState<Uint8Array | null>(
    null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);

  // Add state for stamped PDF preview URL
  const [stampedPdfPreviewUrl, setStampedPdfPreviewUrl] = useState<
    string | null
  >(null);

  // After mounting, we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Reset all state to start over
  const handleReset = () => {
    if (stampedPdfPreviewUrl) {
      URL.revokeObjectURL(stampedPdfPreviewUrl);
    }
    setCurrentStep(0);
    setPdfUploaded(false);
    setStampPlaced(false);
    setError(null);
    setPdfFile(null);
    setIsFetchingUrl(false);
    setPresignedPostData(null);
    setFinalS3Url(null);
    setStampedPdfBytes(null);
    setStampedPdfPreviewUrl(null);
    setIsUploading(false);
    setUploadProgress(0);
    setUploadError(null);
    setUploadComplete(false);
  };

  const handlePdfUpload = async (isUploaded: boolean, fileData?: File) => {
    setPdfUploaded(isUploaded);
    if (fileData) {
      setPdfFile(fileData);
      // When PDF is uploaded, fetch the presigned URL
      await fetchPresignedUrlFromApi();
    } else {
      setPdfFile(null);
      setFinalS3Url(null);
      setPresignedPostData(null);
    }
    setError(null);
  };

  const fetchPresignedUrlFromApi = async () => {
    setIsFetchingUrl(true);
    setError(null);

    try {
      const response = await fetchPresignedUrl();
      setPresignedPostData(response.presignedPostData);
      setFinalS3Url(response.finalUrl);

      // Move to the next step when successful
      handleNextStep();
    } catch (err) {
      setError(
        'Failed to get upload URL: ' +
          (err instanceof Error ? err.message : String(err))
      );
      console.error('API error:', err);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleQrCodePlacement = async (position: {
    x: number;
    y: number;
    page?: number;
    stampImage?: string;
  }) => {
    if (!position.stampImage || !pdfFile) {
      console.error('Missing QR code image or PDF file');
      return;
    }

    setError(null);

    try {
      // Convert file to Uint8Array
      const pdfBytes = await fileToUint8Array(pdfFile);

      // Use the provided position or default to first page
      const stampPosition = {
        x: position.x,
        y: position.y,
        page: position.page || 0,
      };

      console.log('Adding QR code to PDF...');

      // Add the QR code to the PDF
      const modifiedPdfBytes = await addQrCodeToPdf(
        pdfBytes,
        stampPosition,
        position.stampImage
      );

      console.log('PDF modified with QR code');

      // Store the modified PDF bytes for upload
      setStampedPdfBytes(modifiedPdfBytes);

      // Create a preview URL for the stamped PDF
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      const previewUrl = URL.createObjectURL(blob);
      setStampedPdfPreviewUrl(previewUrl);

      // Mark the stamp as placed but DON'T advance to next step
      setStampPlaced(true);
    } catch (err) {
      setError(
        'Failed to add QR code to PDF: ' +
          (err instanceof Error ? err.message : String(err))
      );
      console.error('PDF modification error:', err);
    }
  };

  // Update the reset function
  const resetQrCodePlacement = () => {
    // If we have a preview URL, revoke it to avoid memory leaks
    if (stampedPdfPreviewUrl) {
      URL.revokeObjectURL(stampedPdfPreviewUrl);
    }
    setStampPlaced(false);
    setStampedPdfBytes(null);
    setStampedPdfPreviewUrl(null);
  };

  const handleUploadToS3 = async () => {
    if (!stampedPdfBytes || !presignedPostData) {
      setError('Missing PDF data or upload information');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setError(null);

    try {
      // Upload the stamped PDF to S3
      await uploadToS3(presignedPostData, stampedPdfBytes, (progress) => {
        setUploadProgress(progress);
      });

      // Mark as complete
      setUploadComplete(true);
      setUploadProgress(100);
    } catch (err) {
      setUploadError(
        'Failed to upload PDF: ' +
          (err instanceof Error ? err.message : String(err))
      );
      console.error('S3 upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadModifiedPdf = () => {
    if (stampedPdfBytes) {
      const blob = new Blob([stampedPdfBytes], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFile
        ? `${pdfFile.name.replace('.pdf', '')}-with-qr.pdf`
        : 'document-with-qr.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Update the cleanup in useEffect for memory management
  useEffect(() => {
    return () => {
      // Clean up any blob URLs when component unmounts
      if (stampedPdfPreviewUrl) {
        URL.revokeObjectURL(stampedPdfPreviewUrl);
      }
    };
  }, [stampedPdfPreviewUrl]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <FileSignature className="h-6 w-6" />
            PDF QR Code Stamper
          </CardTitle>
          <CardDescription>
            Upload a PDF, add a verification QR code, and store it in the cloud.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Stepper currentStep={currentStep} className="mb-8">
            <Step
              title="Upload PDF"
              description="Select a PDF document from your computer"
            />
            <Step
              title="Place QR Code"
              description="Position the QR code on your document"
            />
            <Step
              title="Upload & Finish"
              description="Upload to cloud and get your document link"
            />
          </Stepper>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                {currentStep === 0 && pdfFile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchPresignedUrlFromApi}
                    disabled={isFetchingUrl}
                  >
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    Retry
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="mb-6">
            {currentStep === 0 && (
              <div className="space-y-4">
                <PdfUpload onUpload={handlePdfUpload} />

                {isFetchingUrl && (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Getting upload URL...</span>
                  </div>
                )}
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="h-[600px]">
                  <PdfPreview
                    pdfFile={pdfFile}
                    pdfUrl={stampedPdfPreviewUrl || undefined}
                    qrCodeUrl={finalS3Url}
                    onStampPlaced={handleQrCodePlacement}
                    isPlacementComplete={stampPlaced}
                    onResetPlacement={resetQrCodePlacement}
                  />
                </div>

                {/* Show continue button after stamp is placed */}
                {stampPlaced && (
                  <div className="flex justify-end gap-3 mt-4">
                    <Button onClick={handleNextStep}>Continue</Button>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <UploadStatus
                  isUploading={isUploading}
                  uploadProgress={uploadProgress}
                  uploadComplete={uploadComplete}
                  uploadError={uploadError}
                  finalUrl={finalS3Url}
                />

                <div className="flex flex-wrap gap-3 mt-4">
                  {/* Upload/Retry button - only show if not already completed */}
                  {!uploadComplete && (
                    <Button
                      onClick={handleUploadToS3}
                      disabled={isUploading || !stampedPdfBytes}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : uploadError ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry Upload
                        </>
                      ) : (
                        <>
                          <CloudUpload className="mr-2 h-4 w-4" />
                          Upload to Cloud
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={handleDownloadModifiedPdf}
                    disabled={!stampedPdfBytes}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>

                  {/* Add Start Over button */}
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="ml-auto"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Start Over
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePreviousStep}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {currentStep === 0 && (
              <Button
                onClick={handleNextStep}
                disabled={!pdfUploaded || !finalS3Url}
              >
                Next
              </Button>
            )}

            {currentStep === 1 && !stampPlaced && (
              <Button disabled={true}>Place QR Code to Continue</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

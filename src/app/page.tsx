'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stepper, Step } from '@/components/stepper';
import KeypairInput from '@/components/keypair-input';
import PdfUpload from '@/components/pdf-upload';
import PdfPreview from '@/components/pdf-preview';
import MetadataDisplay from '@/components/metadata-display';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSignature,
  Moon,
  Sun,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTheme } from 'next-themes';
import {
  SignatureMetadata,
  fileToUint8Array,
  signPdfWithEd25519,
} from '@/lib/crypto';
import { addSignatureStampToPdf } from '@/lib/pdf-utils';

export default function PDFSignerPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [keypairValid, setKeypairValid] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [pdfSigned, setPdfSigned] = useState(false);
  const [stampPlaced, setStampPlaced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSigningPdf, setIsSigningPdf] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [signatureMetadata, setSignatureMetadata] =
    useState<SignatureMetadata | null>(null);
  const signedPdfBytesRef = useRef<Uint8Array | null>(null);

  // Remove unused state variables or comment them if they might be used later
  // const [stampPosition, setStampPosition] = useState<{ x: number; y: number; page: number } | null>(null);
  const [isStamping, setIsStamping] = useState(false);
  const [finalPdfUrl, setFinalPdfUrl] = useState<string | null>(null);
  const finalPdfBytesRef = useRef<Uint8Array | null>(null);

  // After mounting, we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleKeypairValidation = (
    isValid: boolean,
    keyData?: { privateKey: string; publicKey: string }
  ) => {
    setKeypairValid(isValid);
    if (keyData) {
      setPrivateKey(keyData.privateKey);
      setPublicKey(keyData.publicKey);
    }
  };

  const handlePdfUpload = (isUploaded: boolean, fileData?: File) => {
    setPdfUploaded(isUploaded);
    if (fileData) {
      setPdfFile(fileData);
    } else {
      setPdfFile(null);
    }
    setError(null);
  };

  const handleSignDocument = async () => {
    if (!pdfFile || !privateKey || !publicKey) {
      setError('Missing PDF file or valid keypair');
      return;
    }

    setIsSigningPdf(true);
    setError(null);

    try {
      // Convert the PDF file to Uint8Array
      const pdfBytes = await fileToUint8Array(pdfFile);

      // Sign the PDF with the provided keypair
      const { signedPdfBytes, metadata } = await signPdfWithEd25519(
        pdfBytes,
        privateKey,
        publicKey
      );

      // Store the signed PDF bytes for download
      signedPdfBytesRef.current = signedPdfBytes;

      // Create a URL for the signed PDF
      const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setSignedPdfUrl(url);

      // Set the signature metadata
      setSignatureMetadata(metadata);

      // Mark the PDF as signed
      setPdfSigned(true);
    } catch (err) {
      setError(
        'Failed to sign the PDF: ' +
          (err instanceof Error ? err.message : String(err))
      );
      console.error('PDF signing error:', err);
    } finally {
      setIsSigningPdf(false);
    }
  };

  const handleStampPlacement = async (position: {
    x: number;
    y: number;
    page?: number;
    stampImage?: string;
  }) => {
    if (
      !position.stampImage ||
      !signedPdfBytesRef.current ||
      !signatureMetadata
    ) {
      console.error('Missing stamp image or signed PDF data');
      return;
    }

    setIsStamping(true);

    // Use the provided position or default to first page
    const stampPosition = {
      x: position.x,
      y: position.y,
      page: position.page || 0,
    };

    console.log('Adding stamp to PDF...');

    // Add the visual stamp to the PDF
    const stampedPdfBytes = await addSignatureStampToPdf(
      signedPdfBytesRef.current,
      signatureMetadata,
      stampPosition,
      position.stampImage
    );

    console.log('PDF stamping completed');

    // Store the stamped PDF bytes for download
    finalPdfBytesRef.current = stampedPdfBytes;

    // Create a URL for the stamped PDF
    if (finalPdfUrl) {
      URL.revokeObjectURL(finalPdfUrl);
    }
    const blob = new Blob([stampedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setFinalPdfUrl(url);

    // Mark the stamp as placed
    setStampPlaced(true);
    setIsStamping(false);
  };

  const handleDownloadSignedPdf = () => {
    // Use final stamped PDF if available, otherwise use the signed PDF
    const pdfBytes = finalPdfBytesRef.current || signedPdfBytesRef.current;

    if (pdfBytes) {
      const blob = new Blob([pdfBytes], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFile
        ? `${pdfFile.name.replace('.pdf', '')}-signed.pdf`
        : 'signed-document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Cleanup URLs when component unmounts
  useEffect(() => {
    return () => {
      if (signedPdfUrl) {
        URL.revokeObjectURL(signedPdfUrl);
      }
      if (finalPdfUrl) {
        URL.revokeObjectURL(finalPdfUrl);
      }
    };
  }, [signedPdfUrl, finalPdfUrl]);

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
            PDF Signer
          </CardTitle>
          <CardDescription>
            Sign your PDF documents with an electronic signature and add a
            visual stamp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Stepper currentStep={currentStep} className="mb-8">
            <Step title="Keypair" description="Enter or generate keys" />
            <Step title="Upload" description="Upload your PDF" />
            <Step title="Sign" description="Sign and place stamp" />
            <Step title="Download" description="Get your signed PDF" />
          </Stepper>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {currentStep === 0 && (
            <>
              <KeypairInput onValidation={handleKeypairValidation} />
              <div className="flex justify-end mt-6">
                <Button onClick={handleNextStep} disabled={!keypairValid}>
                  Next: Upload PDF
                </Button>
              </div>
            </>
          )}

          {currentStep === 1 && (
            <>
              <PdfUpload onUpload={handlePdfUpload} />
              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={handlePreviousStep}
                  className="flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleNextStep} disabled={!pdfUploaded}>
                  Next: Sign Document
                </Button>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 relative">
                  {isStamping && (
                    <div className="absolute inset-0 bg-background/80 z-50 flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                        <p>Adding stamp to document...</p>
                      </div>
                    </div>
                  )}
                  <PdfPreview
                    isSigned={pdfSigned}
                    onStampPlaced={handleStampPlacement}
                    pdfFile={signedPdfUrl && finalPdfUrl ? null : pdfFile}
                    pdfUrl={finalPdfUrl || signedPdfUrl || undefined}
                    signatureMetadata={signatureMetadata || undefined}
                  />
                </div>
                <div>
                  {pdfSigned && signatureMetadata ? (
                    <MetadataDisplay metadata={signatureMetadata} />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Sign Document</CardTitle>
                        <CardDescription>
                          Click the button below to sign the document with your
                          keypair
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          onClick={handleSignDocument}
                          className="w-full"
                          disabled={isSigningPdf}
                        >
                          {isSigningPdf ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Signing...
                            </>
                          ) : (
                            'Sign Document'
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={handlePreviousStep}
                  className="flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={handleNextStep}
                  disabled={!pdfSigned || !stampPlaced}
                >
                  Next: Download
                </Button>
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-6 text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">
                    PDF Successfully Signed!
                  </h2>
                  <p className="text-muted-foreground">
                    Your PDF has been signed with your keypair and includes a
                    visual stamp with the signature metadata.
                  </p>
                </div>
                <Button
                  size="lg"
                  className="gap-2"
                  onClick={handleDownloadSignedPdf}
                >
                  <Download className="h-4 w-4" />
                  Download Signed PDF
                </Button>
                <div className="flex gap-4 mt-6">
                  <Button
                    variant="outline"
                    onClick={handlePreviousStep}
                    className="flex items-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Reset all state to initial values
                      setCurrentStep(0);
                      setKeypairValid(false);
                      setPrivateKey('');
                      setPublicKey('');
                      setPdfFile(null);
                      setPdfUploaded(false);
                      setPdfSigned(false);
                      setStampPlaced(false);
                      setError(null);

                      // Clean up PDF URLs and references
                      if (signedPdfUrl) {
                        URL.revokeObjectURL(signedPdfUrl);
                        setSignedPdfUrl(null);
                      }
                      if (finalPdfUrl) {
                        URL.revokeObjectURL(finalPdfUrl);
                        setFinalPdfUrl(null);
                      }
                      signedPdfBytesRef.current = null;
                      finalPdfBytesRef.current = null;
                      setSignatureMetadata(null);

                      // Add slight delay to ensure all state changes have propagated
                      setTimeout(() => {
                        // Force a component re-render if needed
                        setMounted(false);
                        setTimeout(() => {
                          setMounted(true);
                        }, 50);
                      }, 50);
                    }}
                  >
                    Sign Another Document
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

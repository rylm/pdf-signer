import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  ClipboardCopy,
  LinkIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface UploadStatusProps {
  isUploading: boolean;
  uploadProgress: number;
  uploadComplete: boolean;
  uploadError: string | null;
  finalUrl: string | null;
}

export default function UploadStatus({
  isUploading,
  uploadProgress,
  uploadComplete,
  uploadError,
  finalUrl,
}: UploadStatusProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (finalUrl) {
      navigator.clipboard.writeText(finalUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Upload Status</CardTitle>
        <CardDescription>
          {isUploading
            ? 'Uploading your document to the cloud...'
            : uploadComplete
            ? 'Upload complete! Your document is now available at the link below.'
            : uploadError
            ? 'There was an error uploading your document.'
            : 'Ready to upload your document.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isUploading && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-500" />
              <span className="text-sm">Uploading... {uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {uploadComplete && finalUrl && (
          <div className="space-y-3">
            <div className="flex items-center text-green-600 mb-2">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              <span className="font-medium">Successfully uploaded!</span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium">Document Link:</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-md p-2 text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                  <LinkIcon className="h-3.5 w-3.5 inline-block mr-2 opacity-70" />
                  <a
                    href={finalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {finalUrl}
                  </a>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <ClipboardCopy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="flex items-start space-x-2 rounded-md bg-red-50 dark:bg-red-950/50 p-3 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-medium">Upload failed</p>
              <p className="text-sm mt-1">{uploadError}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

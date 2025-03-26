import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InfoIcon, CheckCircle2 } from 'lucide-react';
import { SignatureMetadata } from '@/lib/crypto';

interface MetadataDisplayProps {
  metadata: SignatureMetadata;
}

export default function MetadataDisplay({ metadata }: MetadataDisplayProps) {
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <InfoIcon className="h-5 w-5" />
            Signature Metadata
          </CardTitle>
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
          >
            <CheckCircle2 className="h-3 w-3" />
            Signed
          </Badge>
        </div>
        <CardDescription>
          Details about the electronic signature
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-1">
            Timestamp
          </h4>
          <p className="font-medium">{formatDate(metadata.timestamp)}</p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-1">
            Public Key ID
          </h4>
          <p className="font-mono text-sm bg-muted p-2 rounded">
            {metadata.publicKeyId}
          </p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-1">
            Signature ID
          </h4>
          <p className="font-mono text-sm bg-muted p-2 rounded">
            {metadata.signatureId}
          </p>
        </div>

        <div className="pt-2">
          <p className="text-sm text-muted-foreground">
            This document has been electronically signed with an Ed25519
            keypair. The signature and a self-signed X.509 certificate are
            embedded in the PDF.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

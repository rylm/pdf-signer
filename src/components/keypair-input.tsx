'use client';

import type React from 'react';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, KeyRound, RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { generateEd25519Keypair, validateEd25519Keypair } from '@/lib/crypto';

interface KeypairInputProps {
  onValidation: (
    isValid: boolean,
    keypair?: { privateKey: string; publicKey: string }
  ) => void;
}

export default function KeypairInput({ onValidation }: KeypairInputProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'private' | 'public' | null>(null);

  const validateKeys = useCallback(async () => {
    // Check if keys are provided
    if (!privateKey || !publicKey) {
      setError('Both private and public keys are required');
      onValidation(false);
      return false;
    }

    // Check for hex format
    const hexRegex = /^[0-9a-fA-F]+$/;
    if (!hexRegex.test(privateKey) || !hexRegex.test(publicKey)) {
      setError('Keys must be in hexadecimal format');
      onValidation(false);
      return false;
    }

    // Check key lengths for Ed25519
    // Private key should be 32 bytes (64 hex chars)
    // Public key should be 32 bytes (64 hex chars)
    if (privateKey.length !== 64) {
      setError(
        'Invalid private key length for Ed25519 (should be 64 hex characters)'
      );
      onValidation(false);
      return false;
    }

    if (publicKey.length !== 64) {
      setError(
        'Invalid public key length for Ed25519 (should be 64 hex characters)'
      );
      onValidation(false);
      return false;
    }

    try {
      // Verify keypair correspondence using our utility function
      const isValid = await validateEd25519Keypair(privateKey, publicKey);

      if (!isValid) {
        setError('Private and public keys do not form a valid Ed25519 keypair');
        onValidation(false);
        return false;
      }

      setError(null);
      onValidation(true, { privateKey, publicKey });
      return true;
    } catch (err) {
      setError(
        'Error validating keypair: ' +
          (err instanceof Error ? err.message : String(err))
      );
      onValidation(false);
      return false;
    }
  }, [privateKey, publicKey, onValidation]);

  useEffect(() => {
    if (privateKey && publicKey) {
      validateKeys();
    }
  }, [privateKey, publicKey, validateKeys]);

  const handlePrivateKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrivateKey(e.target.value);
  };

  const handlePublicKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPublicKey(e.target.value);
  };

  const handleGenerateKeypair = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Use our utility function to generate a keypair
      const { privateKey: generatedPrivateKey, publicKey: generatedPublicKey } =
        await generateEd25519Keypair();

      setPrivateKey(generatedPrivateKey);
      setPublicKey(generatedPublicKey);
      onValidation(true, {
        privateKey: generatedPrivateKey,
        publicKey: generatedPublicKey,
      });
    } catch (err) {
      setError(
        'Error generating keypair: ' +
          (err instanceof Error ? err.message : String(err))
      );
      onValidation(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, type: 'private' | 'public') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Ed25519 Keypair
        </CardTitle>
        <CardDescription>
          Enter your Ed25519 keypair in hexadecimal format or generate a new one
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="privateKey">Private Key (Hex)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => copyToClipboard(privateKey, 'private')}
                    disabled={!privateKey}
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy private key</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {copied === 'private' ? 'Copied!' : 'Copy private key'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="privateKey"
            value={privateKey}
            onChange={handlePrivateKeyChange}
            placeholder="Enter private key in hex format"
            className="font-mono text-sm"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="publicKey">Public Key (Hex)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => copyToClipboard(publicKey, 'public')}
                    disabled={!publicKey}
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy public key</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {copied === 'public' ? 'Copied!' : 'Copy public key'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="publicKey"
            value={publicKey}
            onChange={handlePublicKeyChange}
            placeholder="Enter public key in hex format"
            className="font-mono text-sm"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleGenerateKeypair}
          variant="outline"
          className="w-full"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>Generate New Keypair</>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

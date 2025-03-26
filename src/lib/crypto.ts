import * as ed from '@noble/ed25519';
// import * as pkijs from 'pkijs';
// import * as asn1js from 'asn1js';
// import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
// import { SUBFILTER_ETSI_CADES_DETACHED } from '@signpdf/utils';
// import { P12Signer } from '@signpdf/signer-p12';
// import { PDFDocument } from 'pdf-lib';
import { Buffer } from 'buffer';

// const cryptoEngine = pkijs.getCrypto(true); // Use Web Crypto (true)
// pkijs.setEngine('webcrypto', cryptoEngine);

export interface SignatureMetadata {
  timestamp: string;
  publicKeyId: string; // Short identifier for display
  signatureId: string; // Short identifier for display
}

export interface KeyPairHex {
  privateKey: string;
  publicKey: string;
}

// /**
//  * Generates random data using Web Crypto API.
//  * @param length The length of the random data to generate.
//  * @returns A Uint8Array containing random bytes.
//  */
// function getRandomBytes(length: number): Uint8Array {
//   const randomValues = new Uint8Array(length);
//   crypto.getRandomValues(randomValues);
//   return randomValues;
// }

/**
 * Converts a Uint8Array to a hexadecimal string.
 */
export function bytesToHex(bytes: Uint8Array | ArrayBuffer): string {
  const byteArray = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Buffer.from(byteArray).toString('hex');
}

/**
 * Converts a hexadecimal string to a Uint8Array.
 */
export function hexToBytes(hexString: string): Uint8Array {
  const hexWithoutPrefix = hexString.startsWith('0x')
    ? hexString.slice(2)
    : hexString;
  return Buffer.from(hexWithoutPrefix, 'hex');
}

/**
 * Converts a File object (e.g., from an <input type="file">) to Uint8Array.
 */
export async function fileToUint8Array(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(event.target.result));
      } else {
        reject(new Error('Failed to read file as ArrayBuffer.'));
      }
    };
    reader.onerror = (event) => {
      reject(
        new Error(
          `File reading error: ${
            event.target?.error?.message ?? 'Unknown error'
          }`
        )
      );
    };
    reader.readAsArrayBuffer(file);
  });
}

// --- Crypto Utils ---

/**
 * Generates an Ed25519 keypair.
 * @returns Promise<KeyPairHex> - Object containing private and public keys as hex strings.
 */
export async function generateEd25519Keypair(): Promise<KeyPairHex> {
  // Generate a random 32-byte private key (seed)
  const privateKeyBytes = ed.utils.randomPrivateKey();
  // Derive the public key from the private key
  const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);

  // Convert to hex format
  const privateKeyHex = bytesToHex(privateKeyBytes);
  const publicKeyHex = bytesToHex(publicKeyBytes);

  return {
    privateKey: privateKeyHex,
    publicKey: publicKeyHex,
  };
}

/**
 * Validates that the private key and public key form a valid Ed25519 keypair.
 * @param privateKeyHex - Private key as hex string.
 * @param publicKeyHex - Public key as hex string.
 * @returns Promise<boolean> - True if valid, false otherwise.
 */
export async function validateEd25519Keypair(
  privateKeyHex: string,
  publicKeyHex: string
): Promise<boolean> {
  try {
    // Convert hex to bytes
    const privateKeyBytes = hexToBytes(privateKeyHex);
    const providedPublicKeyBytes = hexToBytes(publicKeyHex); // Also convert provided key for length check etc.

    // Basic length checks (Ed25519 keys have fixed lengths)
    // Private key seed is 32 bytes. Public key is 32 bytes.
    // Some libs/formats might represent private key as 64 bytes (seed + pubkey). Adjust if needed.
    if (privateKeyBytes.length !== 32 || providedPublicKeyBytes.length !== 32) {
      console.warn('Invalid key length for Ed25519 validation.');
      return false;
    }

    // Derive the public key from the private key
    const derivedPublicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);

    // Compare the derived public key bytes with the provided public key bytes
    // Constant-time comparison is preferred for security critical code, but less crucial here.
    if (derivedPublicKeyBytes.length !== providedPublicKeyBytes.length) {
      return false; // Should not happen if lengths checked before
    }
    let keysMatch = true;
    for (let i = 0; i < derivedPublicKeyBytes.length; i++) {
      if (derivedPublicKeyBytes[i] !== providedPublicKeyBytes[i]) {
        keysMatch = false;
        break;
      }
    }
    return keysMatch;
  } catch (error) {
    // Any error during conversion or derivation likely means invalid keys
    console.error('Error during keypair validation:', error);
    return false;
  }
}

/**
 * Mock implementation of PDF signing with Ed25519.
 * Returns the original PDF bytes and mock metadata.
 *
 * @param pdfBytes The PDF document as Uint8Array.
 * @param privateKeyHex The private key as hex string (not used in mock).
 * @param publicKeyHex The public key as hex string (used for ID generation).
 * @returns Object with signed PDF bytes (same as input) and mock metadata.
 */
export async function signPdfWithEd25519(
  pdfBytes: Uint8Array,
  privateKeyHex: string,
  publicKeyHex: string
): Promise<{ signedPdfBytes: Uint8Array; metadata: SignatureMetadata }> {
  // Create mock metadata
  const timestamp = new Date().toISOString();
  const publicKeyId = publicKeyHex.slice(0, 8) + '...' + publicKeyHex.slice(-8);
  // Shorter signature ID without "SHA256:" prefix
  const mockSignatureId = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  const metadata: SignatureMetadata = {
    timestamp,
    publicKeyId,
    signatureId: mockSignatureId,
  };

  // In a real implementation, we would sign the PDF here
  // For now, just return the original PDF bytes
  return {
    signedPdfBytes: pdfBytes,
    metadata,
  };
}

// /**
//  * Creates the binary content (ArrayBuffer) for a self-signed X.509 certificate.
//  *
//  * @param keyPair An object containing the Ed25519 private key (seed) and public key as hex strings.
//  * @param commonName The Common Name (CN) to use for the certificate's Subject and Issuer.
//  * @param validityDays The number of days the certificate should be valid for. Defaults to 365.
//  * @returns A Promise that resolves with the X.509 certificate.
//  * @throws Error if keys are invalid or any crypto operation fails.
//  */
// export async function createCertificateAndPkcs8(
//   keyPair: KeyPairHex,
//   commonName: string,
//   validityDays: number = 365
// ): Promise<{ certificateDer: ArrayBuffer; privateKeyPkcs8: ArrayBuffer }> {
//   console.log('Starting P12 creation from Noble Ed25519 keys...');

//   try {
//     // 1. Convert Hex Keys to Bytes
//     const privateKeyBytes = hexToBytes(keyPair.privateKey); // This is the 32-byte seed
//     const publicKeyBytes = hexToBytes(keyPair.publicKey);

//     if (privateKeyBytes.length !== 32) {
//       throw new Error(
//         `Invalid private key length: expected 32 bytes, got ${privateKeyBytes.length}`
//       );
//     }
//     if (publicKeyBytes.length !== 32) {
//       throw new Error(
//         `Invalid public key length: expected 32 bytes, got ${publicKeyBytes.length}`
//       );
//     }
//     console.log('Converted hex keys to byte arrays.');

//     // 2. Import Keys into Web Crypto API format (CryptoKey objects)
//     // We need CryptoKey objects for pkijs signing and key import functions.
//     // We import the raw private key seed. Web Crypto handles the derivation internally.
//     const [publicCryptoKey, privateCryptoKey] = await Promise.all([
//       crypto.subtle.importKey(
//         'raw',
//         publicKeyBytes,
//         { name: 'Ed25519' },
//         true, // extractable (good practice, though not strictly needed for cert creation here)
//         ['verify'] // Public key usage
//       ),
//       crypto.subtle.importKey(
//         'raw',
//         privateKeyBytes, // Import the 32-byte seed
//         { name: 'Ed25519' },
//         true, // MUST be extractable to export as PKCS#8 later
//         ['sign'] // Private key usage
//       ),
//     ]);
//     console.log('Imported keys into Web Crypto CryptoKey format.');

//     // 4. Create Certificate Template
//     const certificate = new pkijs.Certificate();

//     // --- Certificate Basic Fields ---
//     certificate.version = 2; // X.509 v3
//     certificate.serialNumber = new asn1js.Integer({
//       valueHex: getRandomBytes(20),
//     });
//     certificate.signatureAlgorithm.algorithmId = '1.3.101.112'; // Ed25519 OID

//     // --- Issuer and Subject Name (Self-signed) ---
//     const distinguishedName = [
//       new pkijs.AttributeTypeAndValue({
//         type: '2.5.4.3', // CommonName OID
//         value: new asn1js.Utf8String({ value: commonName }),
//       }),
//     ];
//     certificate.issuer.typesAndValues = distinguishedName;
//     certificate.subject.typesAndValues = distinguishedName;

//     // --- Validity Period ---
//     const notBefore = new Date();
//     const notAfter = new Date();
//     notAfter.setDate(notAfter.getDate() + validityDays);
//     certificate.notBefore.value = notBefore;
//     certificate.notAfter.value = notAfter;

//     // --- Public Key Info ---
//     // Import using the CryptoKey public key object
//     await certificate.subjectPublicKeyInfo.importKey(publicCryptoKey);
//     console.log('Set certificate public key info using imported CryptoKey.');

//     // --- Extensions ---
//     const basicConstraints = new pkijs.Extension({
//       extnID: '2.5.29.19', // basicConstraints
//       critical: false,
//       extnValue: new pkijs.BasicConstraints({ cA: false })
//         .toSchema()
//         .toBER(false),
//       parsedValue: false,
//     });

//     const keyUsageBitArray = new ArrayBuffer(1);
//     const keyUsageBitView = new Uint8Array(keyUsageBitArray);
//     keyUsageBitView[0] |= 0x01; // digitalSignature
//     const keyUsage = new pkijs.Extension({
//       extnID: '2.5.29.15', // keyUsage
//       critical: false,
//       extnValue: keyUsageBitArray,
//       parsedValue: keyUsageBitView,
//     });

//     certificate.extensions = [basicConstraints, keyUsage];
//     console.log('Added BasicConstraints and KeyUsage extensions.');

//     // 5. Sign the Certificate
//     // Use the imported private CryptoKey object. Pass empty string for hash alg.
//     console.log('Signing certificate using imported CryptoKey...');
//     await certificate.sign(privateCryptoKey, '');
//     console.log('Certificate signed successfully.');

//     // 6. Create the PKCS#12 structure using pkijs helper
//     const certificateBuffer = certificate.toSchema().toBER(false);
//     const privateKeyPkcs8Buffer = await crypto.subtle.exportKey(
//       'pkcs8',
//       privateCryptoKey
//     );

//     return {
//       certificateDer: certificateBuffer,
//       privateKeyPkcs8: privateKeyPkcs8Buffer,
//     };
//   } catch (error) {
//     console.error('Error creating certificate and PKCS#8:', error);
//     if (error instanceof Error) {
//       throw new Error(
//         `Failed to create certificate and PKCS#8: ${error.message}`
//       );
//     } else {
//       throw new Error(
//         `Failed to create certificate and PKCS#8: ${String(error)}`
//       );
//     }
//   }
// }

// export async function createPkcs12FromCertificateAndPkcs8(
//   certificateDer: ArrayBuffer,
//   privateKeyPkcs8: ArrayBuffer,
//   password: string
// ): Promise<ArrayBuffer> {
//   try {
//     const
//   }
// }

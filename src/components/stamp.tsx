import { SignatureMetadata } from '@/lib/crypto';

interface StampProps {
  metadata?: SignatureMetadata;
}

export function Stamp({ metadata }: StampProps) {
  if (!metadata) return null;

  // Format date for display
  const timestamp = new Date(metadata.timestamp);
  const dateStr = timestamp.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedDate = `${dateStr} ${timeStr}`;

  return (
    <div className="stamp-component rounded-lg bg-blue-50 border-2 border-blue-500 p-3 w-[180px] min-h-[85px]">
      <div className="text-blue-800 font-bold text-[11px] mb-1">
        Digitally Signed
      </div>
      <hr className="border-t border-blue-200 my-1" />
      <div className="text-blue-800 text-[8px] mt-1 mb-1">
        Signed on: {formattedDate}
      </div>
      <div className="text-blue-800 text-[8px] mb-1">
        Key ID: {metadata.publicKeyId}
      </div>
      <div className="text-blue-800 text-[8px]">
        Signature: {metadata.signatureId}
      </div>
    </div>
  );
}

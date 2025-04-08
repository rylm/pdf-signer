import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeStampProps {
  url: string;
}

export function QRCodeStamp({ url }: QRCodeStampProps) {
  if (!url) return null;

  return (
    <div className="stamp-component rounded-lg bg-blue-50 border-2 border-blue-500 p-3 pb-4 w-[180px] min-h-[85px] flex flex-col items-center">
      <div className="text-blue-800 font-bold text-[11px] mb-1">
        Verification Code
      </div>
      <hr className="border-t border-blue-200 w-full my-1" />
      <div className="p-1 rounded mt-1 mb-1">
        <QRCodeSVG
          value={url}
          size={120}
          level="H"
          bgColor="#eff6ff" // Blue-50 color to match stamp background
        />
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

type QrOptions = {
  size?: number;
  margin?: number;
};

/**
 * Membuat QR code sebagai data URL PNG.
 * Dipakai halaman cetak QR dan panel ringkas di dashboard operator.
 */
export function useQrDataUrl(value: string | null, { size = 512, margin = 2 }: QrOptions = {}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setDataUrl(null);
      return;
    }

    let active = true;
    QRCode.toDataURL(value, {
      width: size,
      margin,
      errorCorrectionLevel: 'M',
      color: { dark: '#0b1020', light: '#ffffff' },
    })
      .then((url) => {
        if (active) {
          setDataUrl(url);
        }
      })
      .catch(() => {
        if (active) {
          setDataUrl(null);
        }
      });

    return () => {
      active = false;
    };
  }, [value, size, margin]);

  return dataUrl;
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { getStore, type Store } from '@/lib/api';
import { useQrDataUrl } from '@/lib/use-qr-data-url';

/**
 * Halaman QR yang siap dicetak (A4/letter) dan ditempel di meja kasir.
 * QR mengarah ke halaman ambil tiket toko ini.
 */
export default function StoreQrPage() {
  const params = useParams<{ storeSlug: string }>();
  const slug = typeof params.storeSlug === 'string' ? params.storeSlug : '';

  const [store, setStore] = useState<Store | null>(null);
  const [origin, setOrigin] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!slug) {
      return;
    }
    let active = true;
    getStore(slug)
      .then((data) => {
        if (active) {
          setStore(data);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(String(cause));
        }
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const queueUrl = origin && slug ? `${origin}/queue?store=${encodeURIComponent(slug)}` : null;
  const qr = useQrDataUrl(queueUrl, { size: 1024, margin: 2 });

  const handleDownload = (): void => {
    if (!qr) {
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = qr;
    anchor.download = `qr-${slug || 'toko'}.png`;
    anchor.click();
  };

  return (
    <div className="min-h-dvh bg-white text-slate-900 print:bg-white">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 sm:p-6">
        {/* Toolbar — tidak ikut tercetak */}
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <Link
            href="/operator"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Kembali ke Operator
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!qr}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
            >
              <Download className="size-4" aria-hidden />
              Download PNG
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!qr}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40"
            >
              <Printer className="size-4" aria-hidden />
              Cetak
            </button>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {/* Kartu QR */}
        <section className="flex flex-col items-center gap-5 rounded-3xl border-2 border-dashed border-slate-300 px-6 py-10 text-center print:border-solid print:border-slate-400 print:py-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase">
              QueueExpress
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{store?.name ?? slug}</h1>
            <p className="mt-1 text-sm text-slate-500">Scan untuk ambil nomor antrean</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-3">
            {qr ? (
              <img
                src={qr}
                alt={`QR code antrean ${store?.name ?? slug}`}
                width={320}
                height={320}
                className="size-[280px] sm:size-[320px]"
              />
            ) : (
              <div className="size-[280px] animate-pulse rounded-xl bg-slate-100 sm:size-[320px]" />
            )}
          </div>

          <ol className="space-y-1 text-left text-sm text-slate-600">
            <li>1. Buka kamera HP, arahkan ke QR di atas.</li>
            <li>2. Pilih layanan, lalu tekan “Ambil Nomor Antrean”.</li>
            <li>3. Simpan nomor dan pantau giliran dari HP.</li>
          </ol>

          <p className="max-w-full text-xs break-all text-slate-400">{queueUrl ?? ''}</p>
        </section>
      </div>
    </div>
  );
}

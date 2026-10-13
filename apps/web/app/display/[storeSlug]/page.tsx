'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { Volume2, VolumeX } from 'lucide-react';
import type { DisplayBoardDto } from '@queueexpress/shared';
import { getDisplayBoard } from '@/lib/api';
import { DisplayBoard } from '@/components/display-board';
import { announceQueue, cancelSpeech, unlockAudio } from '@/lib/sound';
import { useStoreSocket } from '@/lib/use-store-socket';

/**
 * TV Display Board untuk monitor toko (PRD section C).
 * Audio announcement diaktifkan setelah user menekan tombol, karena browser
 * memblokir audio otomatis sebelum ada interaksi.
 */
export default function DisplayPage(): ReactNode {
  const params = useParams<{ storeSlug: string }>();
  const storeSlug = params.storeSlug;

  const [data, setData] = useState<DisplayBoardDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  // ID tiket terakhir yang sudah diumumkan. Mencegah pengumuman berulang saat
  // data di-refresh (event socket / polling) padahal nomor tidak berubah.
  const lastAnnouncedRef = useRef<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!storeSlug) {
      return;
    }

    try {
      setData(await getDisplayBoard(storeSlug));
      setError(null);
    } catch (cause) {
      setError(String(cause));
    }
  }, [storeSlug]);

  const { state } = useStoreSocket(data?.store.id ?? null, () => void refresh());

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Pengumuman suara: chime WebAudio + suara sintesis (PRD section C.2).
  // Hanya berbunyi saat nomor yang dilayani BERGANTI, bukan setiap refresh.
  // Semua guard/try-catch ada di lib/sound agar tidak pernah throw ke UI.
  useEffect(() => {
    const serving = data?.currentlyServing;

    if (!audioReady || !serving) {
      return;
    }

    if (lastAnnouncedRef.current === serving.id) {
      return;
    }

    lastAnnouncedRef.current = serving.id;
    announceQueue(serving.ticketNum);
  }, [audioReady, data?.currentlyServing]);

  // Hentikan antrean suara saat halaman di-unmount agar tidak bocor.
  useEffect(() => {
    return () => cancelSpeech();
  }, []);

  const toggleAudio = (): void => {
    setAudioReady((ready) => {
      if (ready) {
        cancelSpeech();
        return false;
      }
      // Tandai nomor yang sedang tampil sebagai "sudah diumumkan" supaya
      // mengaktifkan suara tidak langsung mengumumkan nomor lama.
      lastAnnouncedRef.current = data?.currentlyServing?.id ?? null;
      unlockAudio();
      return true;
    });
  };

  if (error && !data) {
    return <p className="p-8 text-queue-danger">{error}</p>;
  }

  if (!data) {
    return <p className="p-8 text-slate-400">Memuat display board...</p>;
  }

  return (
    <div className="relative">
      <DisplayBoard data={data} />

      <div className="fixed bottom-5 right-5 z-10 flex items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            state === 'online' ? 'bg-queue-success/15 text-queue-success' : 'bg-white/10 text-slate-400'
          }`}
        >
          {state === 'online' ? 'live' : state}
        </span>
        <button
          type="button"
          onClick={toggleAudio}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/50 px-4 py-2 text-sm text-white"
        >
          {audioReady ? (
            <>
              <Volume2 className="size-4" aria-hidden /> Suara aktif
            </>
          ) : (
            <>
              <VolumeX className="size-4" aria-hidden /> Aktifkan suara
            </>
          )}
        </button>
      </div>
    </div>
  );
}
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import type { TicketViewDto } from '@queueexpress/shared';
import { getTicketView } from '@/lib/api';
import { playChime } from '@/lib/sound';
import { useStoreSocket } from '@/lib/use-store-socket';
import { ConnectionBadge } from '@/components/connection-badge';
import { LiveStatusCard } from '@/components/live-status-card';

/** Kartu status pelanggan real-time (PRD section A.2 dan A.3). */
export default function TicketPage(): ReactNode {
  const params = useParams<{ ticketId: string }>();
  const ticketId = params.ticketId;

  const [data, setData] = useState<TicketViewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Cegah getar/bunyi berulang saat polling me-refresh data yang sama.
  const announcedKeyRef = useRef<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!ticketId) {
      return;
    }

    try {
      setData(await getTicketView(ticketId));
      setError(null);
    } catch (cause) {
      setError(String(cause));
    }
  }, [ticketId]);

  const { state } = useStoreSocket(data?.store.id ?? null, () => void refresh());

  useEffect(() => {
    void refresh();
    // Polling fallback supaya status tetap benar walau WebSocket terputus.
    const interval = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Efek getar + bunyi chime saat nomor Anda dipanggil (PRD section A.3).
  // Hanya sekali per tiket+status, bukan setiap polling refresh.
  useEffect(() => {
    if (data?.ticket.status !== 'CALLED') {
      return;
    }
    const key = `${data.ticket.id}:CALLED`;
    if (announcedKeyRef.current === key) {
      return;
    }
    announcedKeyRef.current = key;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    } catch {
      // abaikan — vibration tidak didukung
    }
    playChime();
  }, [data?.ticket.id, data?.ticket.status]);

  if (error && !data) {
    return (
      <Message tone="danger">{error}</Message>
    );
  }

  if (!data) {
    return <Message>Memuat status antrean...</Message>;
  }

  return (
    <main className="queue-backdrop flex min-h-dvh flex-col gap-4 p-6">
      <div className="flex justify-end">
        <ConnectionBadge state={state} />
      </div>
      <LiveStatusCard data={data} />
    </main>
  );
}

function Message({ children, tone }: { children: ReactNode; tone?: 'danger' }): ReactNode {
  return (
    <main className="queue-backdrop flex min-h-dvh items-center justify-center p-6">
      <p
        className={`rounded-2xl border px-6 py-4 text-center ${
          tone === 'danger'
            ? 'border-queue-danger/40 bg-queue-danger/10 text-queue-danger'
            : 'border-white/10 bg-queue-surface/70 text-slate-300'
        }`}
      >
        {children}
      </p>
    </main>
  );
}
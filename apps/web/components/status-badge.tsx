import type { ReactNode } from 'react';
import type { QueueStatus } from '@queueexpress/shared';

/** Varian badge status antrean dengan warna neon dinamis. */
export type BadgeTone = 'serving' | 'queued' | 'done' | 'danger' | 'muted';

const TONE_CLASS: Record<BadgeTone, string> = {
  serving: 'badge-serving',
  queued: 'badge-queued',
  done: 'badge-done',
  danger: 'badge-danger',
  muted: 'badge-muted',
};

export function StatusBadge({ tone, label }: { tone: BadgeTone; label: string }): ReactNode {
  return (
    <span className={`badge ${TONE_CLASS[tone]}`}>
      <span className="badge-dot" aria-hidden />
      {label}
    </span>
  );
}

/** Badge untuk status tiket ala pelanggan: MELAYANI, ANTREAN, SELESAI, dst. */
export function TicketStatusBadge({ status }: { status: QueueStatus }): ReactNode {
  switch (status) {
    case 'CALLED':
    case 'PROCESSING':
      return <StatusBadge tone="serving" label="Melayani" />;
    case 'WAITING':
      return <StatusBadge tone="queued" label="Antrean" />;
    case 'COMPLETED':
      return <StatusBadge tone="done" label="Selesai" />;
    case 'SKIPPED':
      return <StatusBadge tone="danger" label="Dilewati" />;
    case 'CANCELLED':
      return <StatusBadge tone="muted" label="Batal" />;
  }
}

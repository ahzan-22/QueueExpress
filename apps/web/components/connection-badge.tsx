import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { ConnectionState } from '@/lib/use-store-socket';

const labels: Record<ConnectionState, { text: string; className: string }> = {
  connecting: {
    text: 'Menghubungkan',
    className: 'border-neon-amber/40 bg-neon-amber/15 text-[#ffc24b]',
  },
  online: {
    text: 'Real-time aktif',
    className: 'border-neon-emerald/40 bg-neon-emerald/15 text-neon-emerald',
  },
  offline: {
    text: 'Terputus (polling)',
    className: 'border-queue-danger/40 bg-queue-danger/15 text-queue-danger',
  },
};

export function ConnectionBadge({ state }: { state: ConnectionState }): ReactNode {
  const { text, className } = labels[state];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur ${className}`}
    >
      <motion.span
        aria-hidden
        className="size-1.5 rounded-full bg-current shadow-[0_0_8px_2px_currentColor]"
        animate={state === 'connecting' ? { scale: [1, 1.8, 1] } : { scale: 1 }}
        transition={{ duration: 1.1, repeat: state === 'connecting' ? Infinity : 0 }}
      />
      {text}
    </span>
  );
}

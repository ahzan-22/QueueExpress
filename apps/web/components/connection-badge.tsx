import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { ConnectionState } from '@/lib/use-store-socket';

const labels: Record<ConnectionState, { text: string; className: string }> = {
  connecting: { text: 'Menghubungkan', className: 'bg-queue-warn/15 text-queue-warn' },
  online: { text: 'Real-time aktif', className: 'bg-queue-success/15 text-queue-success' },
  offline: { text: 'Terputus ( polling)', className: 'bg-queue-danger/15 text-queue-danger' },
};

export function ConnectionBadge({ state }: { state: ConnectionState }): ReactNode {
  const { text, className } = labels[state];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${className}`}
    >
      <motion.span
        aria-hidden
        className="size-1.5 rounded-full bg-current"
        animate={state === 'connecting' ? { scale: [1, 1.8, 1] } : { scale: 1 }}
        transition={{ duration: 1.1, repeat: state === 'connecting' ? Infinity : 0 }}
      />
      {text}
    </span>
  );
}
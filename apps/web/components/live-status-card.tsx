import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, BellRing, CheckCircle2, Clock3, LoaderCircle, SkipForward, Users } from 'lucide-react';
import type { QueueStatus, TicketViewDto } from '@queueexpress/shared';

/** Label Bahasa Indonesia untuk setiap status antrean. */
const STATUS_META: Record<QueueStatus, { label: string; className: string; icon: ReactNode }> = {
  WAITING: {
    label: 'Menunggu giliran',
    className: 'bg-white/10 text-slate-200',
    icon: <Clock3 className="size-4" aria-hidden />,
  },
  CALLED: {
    label: 'Nomor Anda dipanggil',
    className: 'bg-queue-accent text-queue-bg',
    icon: <BellRing className="size-4" aria-hidden />,
  },
  PROCESSING: {
    label: 'Sedang dilayani',
    className: 'bg-queue-warn/15 text-queue-warn',
    icon: <LoaderCircle className="size-4" aria-hidden />,
  },
  COMPLETED: {
    label: 'Selesai dilayani',
    className: 'bg-queue-success/15 text-queue-success',
    icon: <CheckCircle2 className="size-4" aria-hidden />,
  },
  SKIPPED: {
    label: 'Dilewati (tidak hadir)',
    className: 'bg-queue-danger/15 text-queue-danger',
    icon: <SkipForward className="size-4" aria-hidden />,
  },
  CANCELLED: {
    label: 'Dibatalkan',
    className: 'bg-queue-danger/15 text-queue-danger',
    icon: <Ban className="size-4" aria-hidden />,
  },
};

/**
 * Kartu status pelanggan (PRD section A.2 dan A.3).
 * Warna kartu berubah otomatis saat tinggal 1 antrean dan saat nomor dipanggil.
 */
export function LiveStatusCard({ data }: { data: TicketViewDto }): ReactNode {
  const { ticket, currentlyServing, estimatedWaitMinutes, aheadCount, positionsUntilCall } = data;
  const isYourTurn = ticket.status === 'CALLED';
  const isAlmostTurn = !isYourTurn && positionsUntilCall === 1;
  const statusMeta = STATUS_META[ticket.status];

  const tone = isYourTurn
    ? 'border-queue-accent bg-queue-accent/10'
    : isAlmostTurn
      ? 'border-queue-warn bg-queue-warn/10'
      : 'border-white/10 bg-queue-surface/70';

  return (
    <motion.section
      aria-live="polite"
      className={`rounded-3xl border p-6 backdrop-blur transition-colors ${tone}`}
      animate={isYourTurn ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 1.6, repeat: isYourTurn ? Infinity : 0, ease: 'easeInOut' }}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-slate-400">Nomor tiket Anda</p>
          <p className="queue-ticket-number mt-1 text-5xl font-bold text-white sm:text-6xl">
            {ticket.ticketNum}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {data.store.name} - {data.service.name}
          </p>
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={ticket.status}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${statusMeta.className}`}
          >
            {statusMeta.icon}
            {statusMeta.label}
          </motion.span>
        </AnimatePresence>
      </header>
      {isAlmostTurn ? (
        <motion.p
          key="almost"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 flex items-center gap-2 rounded-2xl bg-queue-warn/15 px-4 py-2 text-sm font-semibold text-queue-warn"
        >
          <BellRing className="size-4" aria-hidden />
          Bersiap, giliran Anda berikutnya
        </motion.p>
      ) : null}

      <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
        <Stat
          icon={<Clock3 className="size-4" aria-hidden />}
          label="Sedang dilayani"
          value={currentlyServing ?? '-'}
        />
        <Stat
          icon={<Users className="size-4" aria-hidden />}
          label="Antrean di depan"
          value={String(aheadCount)}
        />
        <Stat
          icon={<Clock3 className="size-4" aria-hidden />}
          label="Estimasi tunggu"
          value={estimatedWaitMinutes === null ? '-' : `${estimatedWaitMinutes} mnt`}
        />
      </dl>

      <p className="mt-4 text-xs text-slate-400">
        Status diperbarui otomatis. Anda boleh menutup halaman ini dan kembali nanti.
      </p>
    </motion.section>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }): ReactNode {
  return (
    <div className="rounded-2xl bg-black/25 px-3 py-4">
      <dt className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
        {icon}
        {label}
      </dt>
      <dd className="queue-ticket-number mt-2 text-xl font-semibold text-white">{value}</dd>
    </div>
  );
}
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, Clock3, Users } from 'lucide-react';
import type { TicketViewDto } from '@queueexpress/shared';
import { Avatar } from './avatar';
import { TicketStatusBadge } from './status-badge';

/**
 * Kartu status pelanggan (PRD section A.2 dan A.3).
 * Warna kartu berubah otomatis saat tinggal 1 antrean dan saat nomor dipanggil.
 */
export function LiveStatusCard({ data }: { data: TicketViewDto }): ReactNode {
  const { ticket, currentlyServing, estimatedWaitMinutes, aheadCount, positionsUntilCall } = data;
  const isYourTurn = ticket.status === 'CALLED';
  const isAlmostTurn = !isYourTurn && positionsUntilCall === 1;

  const tone = isYourTurn
    ? 'glass glass-amber'
    : isAlmostTurn
      ? 'glass border-neon-amber/30'
      : 'glass';

  return (
    <motion.section
      aria-live="polite"
      className={`rounded-3xl p-6 transition-colors ${tone}`}
      animate={isYourTurn ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 1.6, repeat: isYourTurn ? Infinity : 0, ease: 'easeInOut' }}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={ticket.customerName} size="lg" />
          <div>
            <p className="text-xs tracking-[0.24em] text-slate-400 uppercase">Nomor tiket Anda</p>
            <p className="queue-ticket-number mt-1 text-5xl font-bold text-white sm:text-6xl">
              {ticket.ticketNum}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {data.store.name} - {data.service.name}
            </p>
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={ticket.status}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <TicketStatusBadge status={ticket.status} />
          </motion.span>
        </AnimatePresence>
      </header>
      {isAlmostTurn ? (
        <motion.p
          key="almost"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 flex items-center gap-2 rounded-2xl border border-neon-amber/40 bg-neon-amber/15 px-4 py-2 text-sm font-semibold text-[#ffc24b]"
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
    <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-4">
      <dt className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
        {icon}
        {label}
      </dt>
      <dd className="queue-ticket-number mt-2 text-xl font-semibold text-white">{value}</dd>
    </div>
  );
}

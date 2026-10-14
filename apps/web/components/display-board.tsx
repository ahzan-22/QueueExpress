import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DisplayBoardDto } from '@queueexpress/shared';
import { StatusBadge } from './status-badge';

/**
 * TV Display Board (PRD section C). Nomor besar, Upcoming list,
 * dan mode gelap agar terbaca dari jauh.
 */
export function DisplayBoard({ data }: { data: DisplayBoardDto }): ReactNode {
  const { store, service, currentlyServing, upcoming, servedToday } = data;

  return (
    <div className="queue-backdrop cyber-grid flex min-h-dvh flex-col gap-6 p-8 lg:p-12">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.3em] text-neon-amber uppercase drop-shadow-[0_0_10px_rgba(255,122,0,.7)]">
            Live Queue
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white lg:text-3xl">
            {store.name}
          </h1>
          {service ? <p className="text-sm text-neon-cyan">{service.name}</p> : null}
        </div>
        <div className="glass flex items-center gap-2 rounded-2xl px-4 py-2 text-sm text-slate-300">
          Dilayani hari ini:{' '}
          <span className="queue-ticket-number text-lg font-bold text-neon-emerald">
            {servedToday}
          </span>
        </div>
      </header>

      <section className="glass glass-amber relative flex-1 overflow-hidden rounded-[2rem] p-8">
        <div className="pointer-events-none absolute -top-32 right-0 size-96 rounded-full bg-neon-amber/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-neon-cyan/10 blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Sedang dilayani</p>
          {currentlyServing ? (
            <StatusBadge tone="serving" label="Melayani" />
          ) : (
            <StatusBadge tone="muted" label="Siaga" />
          )}
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={currentlyServing?.ticketNum ?? 'kosong'}
            initial={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="queue-ticket-number text-glow-amber mt-4 text-[clamp(6rem,22vw,18rem)] leading-none font-bold"
          >
            {currentlyServing?.ticketNum ?? '--'}
          </motion.p>
        </AnimatePresence>

        <div className="mt-10">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Antrean berikutnya</p>
          <ul className="mt-4 flex flex-wrap gap-4">
            {upcoming.length === 0 ? (
              <li className="text-lg text-slate-500">Belum ada antrean menunggu</li>
            ) : (
              <AnimatePresence initial={false} mode="popLayout">
                {upcoming.map((ticket, index) => (
                  <motion.li
                    key={ticket.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.04, duration: 0.3, ease: 'easeOut' }}
                    className="glass glass-cyan queue-ticket-number rounded-2xl px-6 py-4 text-3xl text-white"
                  >
                    {ticket.ticketNum}
                  </motion.li>
                ))}
              </AnimatePresence>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}

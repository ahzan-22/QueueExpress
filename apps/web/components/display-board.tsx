import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DisplayBoardDto } from '@queueexpress/shared';

/**
 * TV Display Board (PRD section C). Nomor besar,Upcoming list,
 * dan mode gelap agar terbaca dari jauh.
 */
export function DisplayBoard({ data }: { data: DisplayBoardDto }): ReactNode {
  const { store, service, currentlyServing, upcoming, servedToday } = data;

  return (
    <div className="queue-backdrop flex min-h-dvh flex-col gap-6 p-8 lg:p-12">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white lg:text-3xl">{store.name}</h1>
          {service ? <p className="text-sm text-queue-accent">{service.name}</p> : null}
        </div>
        <p className="text-sm text-slate-400">
          Dilayani hari ini: <span className="queue-ticket-number text-white">{servedToday}</span>
        </p>
      </header>

      <section className="flex-1 rounded-[2rem] border border-white/10 bg-queue-surface/60 p-8 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Sedang dilayani</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={currentlyServing?.ticketNum ?? 'kosong'}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="queue-ticket-number mt-4 text-[clamp(6rem,22vw,18rem)] leading-none font-bold text-queue-accent"
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
                    className="queue-ticket-number rounded-2xl border border-white/10 bg-black/30 px-6 py-4 text-3xl text-white"
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
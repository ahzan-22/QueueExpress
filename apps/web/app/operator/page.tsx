'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DailyStatsDto, DisplayBoardDto, StoreDto } from '@queueexpress/shared';
import {
  callNext,
  getDailyStats,
  getDisplayBoard,
  getStore,
  ticketAction,
  type Service,
  type TicketAction,
} from '@/lib/api';
import { ConnectionBadge } from '@/components/connection-badge';
import { DailyStatsPanel, OperatorControls } from '@/components/operator-controls';
import { useStoreSocket } from '@/lib/use-store-socket';

const DEFAULT_STORE = 'antri-lokal-demo';

/** Dashboard operator untuk HP dan tablet (PRD section B). */
export default function OperatorPage(): ReactNode {
  const [store, setStore] = useState<StoreDto | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<string | undefined>(undefined);
  const [board, setBoard] = useState<DisplayBoardDto | null>(null);
  const [stats, setStats] = useState<DailyStatsDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStore(DEFAULT_STORE)
      .then((data) => {
        setStore(data);
        setServices(data.services);
        setServiceId(data.services[0]?.id);
      })
      .catch((cause: unknown) => setError(String(cause)));
  }, []);

  const load = useCallback(async (): Promise<void> => {
    try {
      const [display, daily] = await Promise.all([
        getDisplayBoard(DEFAULT_STORE, serviceId),
        getDailyStats(DEFAULT_STORE, serviceId),
      ]);

      setBoard(display);
      setStats(daily);
      setError(null);
    } catch (cause) {
      setError(String(cause));
    }
  }, [serviceId]);

  const { state } = useStoreSocket(store?.id ?? null, () => void load());

  useEffect(() => {
    void load();
    // Polling fallback supaya angka tetap benar walau WebSocket terputus.
    const interval = setInterval(() => void load(), 15_000);
    return () => clearInterval(interval);
  }, [load]);

  const run = async (action: () => Promise<unknown>): Promise<void> => {
    setBusy(true);
    setError(null);

    try {
      await action();
      await load();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  };

  const activeQueue = board?.currentlyServing ?? null;
  const activeId = activeQueue?.id;
  const runAction = (action: TicketAction) => {
    if (!activeId) {
      setError('Belum ada antrean yang sedang dilayani.');
      return;
    }

    void run(() => ticketAction(activeId, action));
  };

  return (
    <main className="queue-backdrop min-h-dvh">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">Dashboard Operator</h1>
            <p className="text-sm text-slate-400">{store?.name ?? DEFAULT_STORE}</p>
          </div>
          <ConnectionBadge state={state} />
        </header>

        <div className="flex flex-wrap gap-2">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => setServiceId(service.id)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                serviceId === service.id
                  ? 'bg-queue-accent text-queue-bg'
                  : 'border border-white/15 bg-white/5 text-slate-300'
              }`}
            >
              {service.name}
            </button>
          ))}
        </div>

        {error ? (
          <p className="rounded-2xl border border-queue-danger/40 bg-queue-danger/10 px-4 py-3 text-sm text-queue-danger">
            {error}
          </p>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-queue-surface/50 p-5">
          <p className="text-xs uppercase tracking-widest text-slate-400">Sedang dilayani</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={activeQueue?.ticketNum ?? 'kosong'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="queue-ticket-number mt-2 text-5xl font-bold text-queue-accent"
            >
              {activeQueue?.ticketNum ?? '--'}
            </motion.p>
          </AnimatePresence>
          {activeQueue?.customerName ? (
            <p className="text-slate-300">{activeQueue.customerName}</p>
          ) : null}
        </section>

        <OperatorControls
          activeQueue={activeQueue}
          waitingCount={board?.upcoming.length ?? 0}
          busy={busy}
          onCallNext={() => void run(() => callNext(DEFAULT_STORE, serviceId))}
          onCallAgain={() => void runAction('call-again')}
          onStart={() => void runAction('start')}
          onComplete={() => void runAction('complete')}
          onSkip={() => void runAction('skip')}
        />

        <DailyStatsPanel stats={stats} />

        <section className="rounded-3xl border border-white/10 bg-queue-surface/50 p-5">
          <p className="text-xs uppercase tracking-widest text-slate-400">Antrean menunggu</p>

          {board && board.upcoming.length > 0 ? (
            <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {board.upcoming.map((ticket) => (
                <li
                  key={ticket.id}
                  className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3"
                >
                  <span className="queue-ticket-number text-lg text-white">{ticket.ticketNum}</span>
                  <span className="block text-xs text-slate-400">
                    {ticket.customerName ?? 'tanpa nama'}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-slate-400">Belum ada pelanggan yang menunggu.</p>
          )}
        </section>
      </div>
    </main>
  );
}
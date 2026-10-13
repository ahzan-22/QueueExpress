'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Columns2, MonitorPlay, Smartphone, TicketPlus } from 'lucide-react';
import type { DailyStatsDto, DisplayBoardDto, TicketViewDto } from '@queueexpress/shared';
import {
  callNext,
  createTicket,
  getDailyStats,
  getDisplayBoard,
  getStore,
  getTicketView,
  ticketAction,
} from '@/lib/api';
import { DisplayBoard } from '@/components/display-board';
import { ConnectionBadge } from '@/components/connection-badge';
import { BigButton, DailyStatsPanel } from '@/components/operator-controls';
import { useStoreSocket } from '@/lib/use-store-socket';
import { LiveStatusCard } from '@/components/live-status-card';

const DEFAULT_STORE = 'antri-lokal-demo';

/**
 * Public Showcase / Demo Mode (PRD section D).
 * Sisi kiri = Operator, sisi kanan = Pelanggan, keduanya memakai store demo
 * yang sama sehingga sinkronisasi real-time bisa diamati langsung.
 */
export default function DemoPage(): ReactNode {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [board, setBoard] = useState<DisplayBoardDto | null>(null);
  const [stats, setStats] = useState<DailyStatsDto | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketViewDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const requests: Promise<unknown>[] = [
        getDisplayBoard(DEFAULT_STORE),
        getDailyStats(DEFAULT_STORE),
      ];

      if (ticketId) {
        requests.push(getTicketView(ticketId));
      }

      const [display, daily, view] = (await Promise.all(requests)) as [
        DisplayBoardDto,
        DailyStatsDto,
        TicketViewDto | undefined,
      ];

      setBoard(display);
      setStats(daily);
      if (view) {
        setTicket(view);
      }
      setError(null);
    } catch (cause) {
      setError(String(cause));
    }
  }, [ticketId]);

  const { state } = useStoreSocket(storeId, () => void refresh());

  useEffect(() => {
    getStore(DEFAULT_STORE)
      .then((store) => setStoreId(store.id))
      .catch((cause: unknown) => setError(String(cause)));

    void refresh();
  }, [refresh]);

  const run = async (action: () => Promise<unknown>): Promise<void> => {
    setBusy(true);

    try {
      await action();
      await refresh();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  };

  const handleNewTicket = (): void => {
    void run(async () => {
      const created = await createTicket(DEFAULT_STORE, {});
      setTicketId(created.id);
      setTicket(await getTicketView(created.id));
    });
  };

  const activeId = board?.currentlyServing?.id ?? '';

  return (
    <main className="queue-backdrop min-h-dvh">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Columns2 className="size-5 text-queue-accent" aria-hidden />
          Demo Dual-Screen <span className="text-slate-500">- {DEFAULT_STORE}</span>
        </h1>
        <ConnectionBadge state={state} />
      </header>

      {error ? (
        <p className="mx-6 mt-4 rounded-2xl border border-queue-danger/40 bg-queue-danger/10 px-4 py-3 text-sm text-queue-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-queue-surface/50 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-widest text-slate-400 uppercase">
            <MonitorPlay className="size-4" aria-hidden /> Sisi Operator
          </h2>

          <AnimatePresence mode="wait">
            <motion.p
              key={board?.currentlyServing?.ticketNum ?? 'kosong'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="queue-ticket-number mt-4 text-4xl font-bold text-queue-accent"
            >
              {board?.currentlyServing?.ticketNum ?? '--'}
            </motion.p>
          </AnimatePresence>

          <div className="mt-4 grid gap-2">
            <BigButton
              onClick={() => void run(() => callNext(DEFAULT_STORE))}
              disabled={busy}
              tone="accent"
              icon={<MonitorPlay className="size-5" aria-hidden />}
              label="Panggil Selanjutnya"
            />
            <div className="grid grid-cols-2 gap-2">
              <BigButton
                onClick={() => void run(() => ticketAction(activeId, 'call-again'))}
                disabled={busy || !activeId}
                tone="ghost"
                icon={<Columns2 className="size-5" aria-hidden />}
                label="Panggil Ulang"
              />
              <BigButton
                onClick={() => void run(() => ticketAction(activeId, 'complete'))}
                disabled={busy || !activeId}
                tone="success"
                icon={<Columns2 className="size-5" aria-hidden />}
                label="Selesai"
              />
            </div>
          </div>

          <div className="mt-4">
            <DailyStatsPanel stats={stats} />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-widest text-slate-400 uppercase">
            <Smartphone className="size-4" aria-hidden /> Sisi Pelanggan
          </h2>

          {ticket ? (
            <LiveStatusCard data={ticket} />
          ) : (
            <p className="rounded-3xl border border-white/10 bg-queue-surface/50 p-6 text-slate-400">
              Belum ada tiket pelanggan aktif. Buat tiket untuk melihat sinkronisasi real-time.
            </p>
          )}

          <BigButton
            onClick={handleNewTicket}
            disabled={busy}
            tone="accent"
            icon={<TicketPlus className="size-5" aria-hidden />}
            label="Buat Tiket Pelanggan"
          />
        </section>
      </div>

      <section className="px-6 pb-6">
        <h2 className="mb-2 text-sm font-semibold tracking-widest text-slate-400 uppercase">
          Pratinjau TV Display Board
        </h2>
        <div className="overflow-hidden rounded-3xl border border-white/10">
          {board ? <DisplayBoard data={board} /> : null}
        </div>
      </section>
    </main>
  );
}
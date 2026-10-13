'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DailyStatsDto, DisplayBoardDto, QueueDto, StoreDto } from '@queueexpress/shared';
import {
  callNext,
  createManualTicket,
  deleteTicket,
  getDailyStats,
  getDisplayBoard,
  getStore,
  resetDailyQueue,
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
  // pendingAction = aksi spesifik yang sedang berjalan. Tombol lain TETAP aktif
  // (tidak seperti busy global) sehingga operator bisa menekan beruntun.
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const busy = pendingAction !== null;
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualServiceId, setManualServiceId] = useState<string | undefined>(undefined);

  // Cegah setState setelah unmount + cegah fetch tumpang tindih.
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    getStore(DEFAULT_STORE)
      .then((data) => {
        if (!mountedRef.current) {
          return;
        }
        setStore(data);
        setServices(data.services);
        setServiceId((current) => current ?? data.services[0]?.id);
      })
      .catch((cause: unknown) => {
        if (mountedRef.current) {
          setError(String(cause));
        }
      });
  }, []);

  const load = useCallback(async (): Promise<void> => {
    // Dedupe: jika fetch sedang berjalan, jangan mulai yang baru.
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;
    try {
      const [display, daily] = await Promise.all([
        getDisplayBoard(DEFAULT_STORE, serviceId),
        getDailyStats(DEFAULT_STORE, serviceId),
      ]);
      if (!mountedRef.current) {
        return;
      }
      setBoard(display);
      setStats(daily);
      setError(null);
    } catch (cause) {
      if (mountedRef.current) {
        setError(String(cause));
      }
    } finally {
      loadingRef.current = false;
    }
  }, [serviceId]);

  /** Refresh yang digabung: banyak event WS dalam 70ms = 1 fetch. */
  const requestRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      return;
    }
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      void load();
    }, 70);
  }, [load]);

  const { state } = useStoreSocket(store?.id ?? null, () => requestRefresh());
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    void load();
    // Polling hanya sebagai fallback saat WebSocket putus — hemat request
    // dan hindari re-render yang bikin tombol terasa lag saat online.
    const interval = setInterval(() => {
      if (stateRef.current !== 'online') {
        void load();
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, [load]);

  const run = useCallback(
    async (key: string, action: () => Promise<unknown>, optimistic?: () => void): Promise<void> => {
      // Optimistic update dulu → tombol terasa instan (<16ms), server menyusul.
      optimistic?.();
      setPendingAction(key);
      setError(null);
      setNotice(null);
      try {
        await action();
        // WS broadcast akan memicu requestRefresh; load langsung sebagai
        // penjamin agar UI konsisten walau WS lambat.
        await load();
      } catch (cause) {
        setError(String(cause));
        // Rollback: tarik ulang state benar dari server.
        await load();
      } finally {
        if (mountedRef.current) {
          setPendingAction(null);
        }
      }
    },
    [load],
  );

  const activeQueue = board?.currentlyServing ?? null;
  const activeId = activeQueue?.id;
  const runAction = (action: TicketAction) => {
    if (!activeId) {
      setError('Belum ada antrean yang sedang dilayani.');
      return;
    }
    const id = activeId;
    // Optimistic: Selesai/Lewati langsung kosongkan layar, Panggil Ulang tidak ubah.
    const optimistic =
      action === 'complete' || action === 'skip' || action === 'cancel'
        ? () =>
            setBoard((prev) =>
              prev ? { ...prev, currentlyServing: null, upcoming: prev.upcoming } : prev,
            )
        : undefined;
    void run(`ticket:${action}`, () => ticketAction(id, action), optimistic);
  };

  const handleCallNext = (): void => {
    const sid = serviceId;
    // Optimistic: geser antrean pertama jadi "sedang dilayani" langsung.
    void run(
      'call-next',
      () => callNext(DEFAULT_STORE, sid),
      () =>
        setBoard((prev) => {
          if (!prev || prev.upcoming.length === 0) {
            return prev;
          }
          const [first, ...rest] = prev.upcoming;
          if (!first) {
            return prev;
          }
          const now: QueueDto = { ...first, status: 'CALLED', calledAt: new Date().toISOString() };
          return { ...prev, currentlyServing: now, upcoming: rest };
        }),
    );
  };

  const handleManualAdd = (): void => {
    const targetService = manualServiceId ?? serviceId;
    if (!targetService) {
      setError('Pilih layanan dulu sebelum menambah antrean manual.');
      return;
    }
    const name = manualName.trim();
    void run(
      'manual-add',
      async () => {
        const created = await createManualTicket(DEFAULT_STORE, {
          serviceId: targetService,
          customerName: name ? name : undefined,
        });
        if (mountedRef.current) {
          setManualName('');
          setNotice(`Antrean manual ${created.ticketNum} ditambahkan.`);
        }
      },
      () =>
        setStats((prev) =>
          prev ? { ...prev, remainingActive: prev.remainingActive + 1 } : prev,
        ),
    );
  };

  const handleReset = (): void => {
    const confirmed = window.confirm(
      'Reset antrean harian? Semua tiket akan dihapus dan nomor kembali ke A-001. Lanjutkan?',
    );
    if (!confirmed) {
      return;
    }
    void run('reset', async () => {
      const result = await resetDailyQueue(DEFAULT_STORE);
      if (mountedRef.current) {
        setNotice(`Antrean direset. ${result.deleted} tiket dihapus — nomor kembali dari awal.`);
      }
    });
  };

  const handleCancelWaiting = (ticketId: string, ticketNum: string): void => {
    if (!window.confirm(`Batalkan antrean ${ticketNum}?`)) {
      return;
    }
    // Optimistic: keluarkan dari daftar menunggu langsung.
    void run(
      `cancel:${ticketId}`,
      async () => {
        await ticketAction(ticketId, 'cancel');
        if (mountedRef.current) {
          setNotice(`Antrean ${ticketNum} dibatalkan.`);
        }
      },
      () =>
        setBoard((prev) =>
          prev ? { ...prev, upcoming: prev.upcoming.filter((t) => t.id !== ticketId) } : prev,
        ),
    );
  };

  const handleDeleteWaiting = (ticketId: string, ticketNum: string): void => {
    if (!window.confirm(`Hapus permanen antrean ${ticketNum}? Data tidak bisa dikembalikan.`)) {
      return;
    }
    void run(
      `delete:${ticketId}`,
      async () => {
        await deleteTicket(ticketId);
        if (mountedRef.current) {
          setNotice(`Antrean ${ticketNum} dihapus permanen.`);
        }
      },
      () =>
        setBoard((prev) =>
          prev ? { ...prev, upcoming: prev.upcoming.filter((t) => t.id !== ticketId) } : prev,
        ),
    );
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
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-100 touch-manipulation active:scale-95 ${
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

        {notice ? (
          <p className="rounded-2xl border border-queue-success/40 bg-queue-success/10 px-4 py-3 text-sm text-queue-success">
            {notice}
          </p>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-queue-surface/50 p-5">
          <p className="text-xs uppercase tracking-widest text-slate-400">Sedang dilayani</p>
          {/* popLayout + durasi pendek: nomor baru langsung masuk tanpa tunggu exit. */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={activeQueue?.ticketNum ?? 'kosong'}
              initial={{ opacity: 0, y: 10, scale: 0.97, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, scale: 0.98, filter: 'blur(4px)' }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
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
          busy={false}
          onCallNext={handleCallNext}
          onCallAgain={() => void runAction('call-again')}
          onStart={() => void runAction('start')}
          onComplete={() => void runAction('complete')}
          onSkip={() => void runAction('skip')}
        />

        <DailyStatsPanel stats={stats} />

        <section className="rounded-3xl border border-white/10 bg-queue-surface/50 p-5">
          <p className="text-xs uppercase tracking-widest text-slate-400">Tambah antrean manual</p>
          <p className="mt-1 text-sm text-slate-400">
            Untuk pelanggan walk-in / telepon — langsung masuk antrean tanpa scan QR.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Nama pelanggan (opsional)"
              maxLength={60}
              className="flex-1 rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-queue-accent focus:outline-none"
            />
            <select
              value={manualServiceId ?? serviceId ?? ''}
              onChange={(e) => setManualServiceId(e.target.value || undefined)}
              className="rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm text-white focus:border-queue-accent focus:outline-none"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900">
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleManualAdd}
              disabled={busy || !serviceId}
              className="rounded-xl bg-queue-accent px-5 py-3 text-sm font-semibold text-queue-bg transition hover:bg-queue-accent-strong disabled:opacity-40 touch-manipulation active:scale-95"
            >
              {pendingAction === 'manual-add' ? 'Menambah...' : '+ Tambah'}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-queue-danger/30 bg-queue-danger/5 p-5">
          <p className="text-xs uppercase tracking-widest text-queue-danger">Reset antrean harian</p>
          <p className="mt-1 text-sm text-slate-400">
            Menghapus seluruh tiket dan mengembalikan nomor ke awal (mis. A-001). Gunakan saat buka
            hari baru / tutup toko.
          </p>
          <button
            type="button"
            onClick={handleReset}
            disabled={busy}
            className="mt-3 rounded-xl border border-queue-danger/50 bg-queue-danger/10 px-5 py-3 text-sm font-semibold text-queue-danger transition hover:bg-queue-danger/20 disabled:opacity-40 touch-manipulation active:scale-95"
          >
            {pendingAction === 'reset' ? 'Mereset...' : 'Reset Antrean Harian'}
          </button>
        </section>

        <section className="rounded-3xl border border-white/10 bg-queue-surface/50 p-5">
          <p className="text-xs uppercase tracking-widest text-slate-400">Antrean menunggu</p>

          {board && board.upcoming.length > 0 ? (
            <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence initial={false}>
                {board.upcoming.map((ticket) => (
                  <WaitingRow
                    key={ticket.id}
                    ticket={ticket}
                    disabled={busy}
                    onCancel={() => handleCancelWaiting(ticket.id, ticket.ticketNum)}
                    onDelete={() => handleDeleteWaiting(ticket.id, ticket.ticketNum)}
                  />
                ))}
              </AnimatePresence>
            </ol>
          ) : (
            <p className="mt-3 text-slate-400">Belum ada pelanggan yang menunggu.</p>
          )}
        </section>
      </div>
    </main>
  );
}

const WaitingRow = memo(function WaitingRow({
  ticket,
  disabled,
  onCancel,
  onDelete,
}: {
  ticket: QueueDto;
  disabled: boolean;
  onCancel: () => void;
  onDelete: () => void;
}): ReactNode {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3"
    >
      <span className="queue-ticket-number text-lg text-white">{ticket.ticketNum}</span>
      <span className="block text-xs text-slate-400">{ticket.customerName ?? 'tanpa nama'}</span>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="flex-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-40 touch-manipulation active:scale-95"
        >
          Batalkan
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="flex-1 rounded-lg border border-queue-danger/40 bg-queue-danger/10 px-2 py-1.5 text-xs font-medium text-queue-danger transition hover:bg-queue-danger/20 disabled:opacity-40 touch-manipulation active:scale-95"
        >
          Hapus
        </button>
      </div>
    </motion.li>
  );
});

'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  MonitorPlay,
  PlusCircle,
  RotateCcw,
  Ticket,
  Zap,
} from 'lucide-react';
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
import { DailyLoadChart, DailyStatsPanel, OperatorControls } from '@/components/operator-controls';
import { Avatar } from '@/components/avatar';
import { StatusBadge } from '@/components/status-badge';
import { useStoreSocket } from '@/lib/use-store-socket';

const DEFAULT_STORE = 'antri-lokal-demo';

const NAV = [
  { href: '/operator', label: 'Dashboard', icon: LayoutDashboard, active: true },
  { href: '/display/antri-lokal-demo', label: 'TV Display', icon: MonitorPlay, active: false },
];

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
    <div className="queue-backdrop cyber-grid min-h-dvh">
      <div className="mx-auto flex max-w-7xl gap-6 p-4 sm:p-6">
        {/* Sidebar navigasi futuristik (desktop) */}
        <aside className="glass sticky top-6 hidden h-fit w-60 shrink-0 flex-col gap-1 rounded-3xl p-4 lg:flex">
          <div className="flex items-center gap-3 px-2 py-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-amber via-[#ff4d00] to-neon-cyan shadow-[0_0_22px_-4px_rgba(255,122,0,.8)]">
              <Zap className="size-5 text-white" aria-hidden />
            </span>
            <div>
              <p className="font-display text-sm font-bold text-white">QueueExpress</p>
              <p className="text-[0.65rem] tracking-[0.2em] text-slate-400 uppercase">
                Operator Deck
              </p>
            </div>
          </div>
          <div className="neon-divider my-2" />
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${item.active ? 'sidebar-link-active' : ''}`}
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="neon-divider my-2" />
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <p className="text-[0.65rem] tracking-[0.2em] text-slate-500 uppercase">Toko aktif</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">
              {store?.name ?? DEFAULT_STORE}
            </p>
            <div className="mt-2">
              <ConnectionBadge state={state} />
            </div>
          </div>
        </aside>

        {/* Kolom utama */}
        <main className="flex min-w-0 flex-1 flex-col gap-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.7rem] tracking-[0.28em] text-neon-amber uppercase drop-shadow-[0_0_10px_rgba(255,122,0,.7)]">
                Command Center
              </p>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                Dashboard <span className="text-neon-gradient">Operator</span>
              </h1>
              <p className="text-sm text-slate-400">{store?.name ?? DEFAULT_STORE}</p>
            </div>
            <div className="lg:hidden">
              <ConnectionBadge state={state} />
            </div>
          </header>

          {/* Navigasi ringkas untuk mobile */}
          <nav className="flex gap-2 lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link flex-1 justify-center !gap-2 text-xs ${item.active ? 'sidebar-link-active' : 'border-white/10 bg-white/5'}`}
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-wrap gap-2">
            {services.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => setServiceId(service.id)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150 touch-manipulation active:scale-95 ${
                  serviceId === service.id
                    ? 'bg-gradient-to-r from-neon-amber to-[#ff4d00] text-[#1a0d00] shadow-[0_0_22px_-4px_rgba(255,122,0,.8)]'
                    : 'glass border-white/10 text-slate-300 hover:border-neon-cyan/40'
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
            <p className="rounded-2xl border border-neon-emerald/40 bg-neon-emerald/10 px-4 py-3 text-sm text-neon-emerald">
              {notice}
            </p>
          ) : null}

          {/* Hero: sedang dilayani */}
          <section className="glass glass-amber relative overflow-hidden rounded-3xl p-6">
            <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-neon-amber/20 blur-3xl" />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.28em] text-slate-400 uppercase">Sedang dilayani</p>
                {/* popLayout + durasi pendek: nomor baru langsung masuk tanpa tunggu exit. */}
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.p
                    key={activeQueue?.ticketNum ?? 'kosong'}
                    initial={{ opacity: 0, y: 10, scale: 0.97, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -10, scale: 0.98, filter: 'blur(4px)' }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="queue-ticket-number text-glow-amber mt-2 text-6xl font-bold sm:text-7xl"
                  >
                    {activeQueue?.ticketNum ?? '--'}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="flex flex-col items-end gap-3">
                {activeQueue ? (
                  <StatusBadge tone="serving" label="Melayani" />
                ) : (
                  <StatusBadge tone="muted" label="Siaga" />
                )}
                {activeQueue ? (
                  <div className="glass flex items-center gap-3 rounded-2xl px-4 py-2.5">
                    <Avatar name={activeQueue.customerName} size="md" />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {activeQueue.customerName ?? 'Tanpa nama'}
                      </p>
                      <p className="queue-ticket-number text-xs text-slate-400">
                        {activeQueue.ticketNum}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Belum ada yang dipanggil</p>
                )}
              </div>
            </div>
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

          {/* Ringkasan harian */}
          <div className="grid gap-3 xl:grid-cols-[1fr_380px]">
            <DailyStatsPanel stats={stats} />
            <DailyLoadChart stats={stats} />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="glass rounded-3xl p-5">
              <p className="flex items-center gap-2 text-xs tracking-[0.24em] text-slate-400 uppercase">
                <PlusCircle className="size-4 text-neon-emerald" aria-hidden />
                Tambah antrean manual
              </p>
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
                  className="flex-1 rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-neon-cyan focus:shadow-[0_0_16px_-4px_rgba(34,211,238,.7)] focus:outline-none"
                />
                <select
                  value={manualServiceId ?? serviceId ?? ''}
                  onChange={(e) => setManualServiceId(e.target.value || undefined)}
                  className="rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm text-white focus:border-neon-cyan focus:outline-none"
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
                  className="btn-neon btn-emerald rounded-xl px-5 py-3 text-sm font-bold"
                >
                  {pendingAction === 'manual-add' ? 'Menambah...' : '+ Tambah'}
                </button>
              </div>
            </section>

            <section className="glass rounded-3xl border-queue-danger/30 bg-queue-danger/5 p-5">
              <p className="flex items-center gap-2 text-xs tracking-[0.24em] text-queue-danger uppercase">
                <RotateCcw className="size-4" aria-hidden />
                Reset antrean harian
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Menghapus seluruh tiket dan mengembalikan nomor ke awal (mis. A-001). Gunakan saat
                buka hari baru / tutup toko.
              </p>
              <button
                type="button"
                onClick={handleReset}
                disabled={busy}
                className="btn-neon btn-danger-neon mt-3 rounded-xl px-5 py-3 text-sm font-semibold"
              >
                {pendingAction === 'reset' ? 'Mereset...' : 'Reset Antrean Harian'}
              </button>
            </section>
          </div>

          <section className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs tracking-[0.24em] text-slate-400 uppercase">
                <Ticket className="size-4 text-neon-cyan" aria-hidden />
                Antrean menunggu
              </p>
              <StatusBadge tone="queued" label={`${board?.upcoming.length ?? 0} antre`} />
            </div>

            {board && board.upcoming.length > 0 ? (
              <ol className="slim-scroll mt-3 grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence initial={false}>
                  {board.upcoming.map((ticket, index) => (
                    <WaitingRow
                      key={ticket.id}
                      ticket={ticket}
                      position={index + 1}
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
        </main>
      </div>
    </div>
  );
}

const WaitingRow = memo(function WaitingRow({
  ticket,
  position,
  disabled,
  onCancel,
  onDelete,
}: {
  ticket: QueueDto;
  position: number;
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
      className="glass glass-cyan flex items-center gap-3 rounded-2xl px-4 py-3"
    >
      <span className="queue-ticket-number w-7 text-sm font-bold text-neon-cyan">#{position}</span>
      <Avatar name={ticket.customerName} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="queue-ticket-number truncate text-base font-bold text-white">
          {ticket.ticketNum}
        </p>
        <p className="truncate text-xs text-slate-400">{ticket.customerName ?? 'Tanpa nama'}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="btn-neon rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[0.7rem] font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-40"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="btn-neon btn-danger-neon rounded-lg px-2.5 py-1 text-[0.7rem] font-semibold"
        >
          Hapus
        </button>
      </div>
    </motion.li>
  );
});

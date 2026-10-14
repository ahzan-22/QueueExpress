import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  AlarmClock,
  CheckCircle2,
  CirclePlay,
  Hourglass,
  PhoneCall,
  SkipForward,
  Users,
} from 'lucide-react';
import type { DailyStatsDto, QueueDto } from '@queueexpress/shared';

/** Tombol kontrol ukuran besar, ramah jempol (PRD section B.1). */
export function OperatorControls({
  activeQueue,
  waitingCount,
  busy,
  onCallNext,
  onCallAgain,
  onStart,
  onComplete,
  onSkip,
}: {
  activeQueue: QueueDto | null;
  waitingCount: number;
  busy: boolean;
  onCallNext: () => void;
  onCallAgain: () => void;
  onStart: () => void;
  onComplete: () => void;
  onSkip: () => void;
}): ReactNode {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <BigButton
        onClick={onCallNext}
        disabled={busy || waitingCount === 0}
        tone="amber"
        icon={<PhoneCall className="size-6" aria-hidden />}
        label="Panggil Selanjutnya"
        hint={waitingCount === 0 ? 'Antrean kosong' : `${waitingCount} menunggu`}
      />
      <BigButton
        onClick={onCallAgain}
        disabled={busy || !activeQueue}
        tone="cyan"
        icon={<PhoneCall className="size-6" aria-hidden />}
        label="Panggil Ulang"
        hint={activeQueue ? `Kirim ulang ke ${activeQueue.ticketNum}` : 'Belum ada yang dipanggil'}
      />
      <BigButton
        onClick={onStart}
        disabled={busy || activeQueue?.status !== 'CALLED'}
        tone="ghost"
        icon={<CirclePlay className="size-6" aria-hidden />}
        label="Mulai Layanan"
        hint="Status jadi PROCESSING"
      />
      <BigButton
        onClick={onComplete}
        disabled={busy || !activeQueue}
        tone="emerald"
        icon={<CheckCircle2 className="size-6" aria-hidden />}
        label="Selesaikan"
        hint={activeQueue ? `Tutup ${activeQueue.ticketNum}` : '-'}
      />
      <BigButton
        onClick={onSkip}
        disabled={busy || !activeQueue}
        tone="danger"
        icon={<SkipForward className="size-6" aria-hidden />}
        label="Lewati / Batal"
        hint="Pelanggan tidak hadir"
        className="sm:col-span-2 lg:col-span-4"
      />
    </div>
  );
}

const tones = {
  amber: 'btn-amber',
  emerald: 'btn-emerald',
  cyan: 'btn-cyan',
  danger: 'btn-danger-neon',
  ghost: 'btn-ghost-neon',
} as const;

export function BigButton({
  onClick,
  disabled,
  tone,
  icon,
  label,
  hint,
  className = '',
}: {
  onClick: () => void;
  disabled?: boolean;
  tone: keyof typeof tones;
  icon: ReactNode;
  label: string;
  hint?: string;
  className?: string;
}): ReactNode {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      // Respons sentuh instan: skala kecil + spring kaku, tanpa delay.
      whileTap={disabled ? undefined : { scale: 0.96 }}
      whileHover={disabled ? undefined : { scale: 1.015, y: -1 }}
      transition={{ type: 'spring', stiffness: 600, damping: 32 }}
      style={{ willChange: 'transform' }}
      className={`btn-neon flex min-h-28 flex-col items-start justify-between gap-2 rounded-2xl p-5 text-left text-lg font-semibold touch-manipulation select-none ${tones[tone]} ${className}`}
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      {hint ? <span className="text-xs font-normal opacity-75">{hint}</span> : null}
    </motion.button>
  );
}

/** Panel statistik harian: stat card elegan dengan ikon neon (PRD section B.3). */
export function DailyStatsPanel({ stats }: { stats: DailyStatsDto | null }): ReactNode {
  if (!stats) {
    return null;
  }

  const items = [
    {
      label: 'Dilayani hari ini',
      value: stats.servedToday,
      icon: <CheckCircle2 className="size-5" aria-hidden />,
      glow: 'rgba(16,229,154,.7)',
      chip: 'linear-gradient(135deg,#5ef2b8,#0aa872)',
      chipText: '#02281b',
    },
    {
      label: 'Antrean tersisa',
      value: stats.remainingActive,
      icon: <Users className="size-5" aria-hidden />,
      glow: 'rgba(34,211,238,.7)',
      chip: 'linear-gradient(135deg,#8bf5ff,#0e8fa8)',
      chipText: '#03252c',
    },
    {
      label: 'Rata-rata tunggu',
      value: stats.averageWaitMinutes ?? '-',
      icon: <Hourglass className="size-5" aria-hidden />,
      glow: 'rgba(255,122,0,.7)',
      chip: 'linear-gradient(135deg,#ffb300,#ff4d00)',
      chipText: '#1a0d00',
    },
    {
      label: 'Dilewati',
      value: stats.skippedToday,
      icon: <AlarmClock className="size-5" aria-hidden />,
      glow: 'rgba(255,77,109,.6)',
      chip: 'linear-gradient(135deg,#ff8fa3,#e11d48)',
      chipText: '#2b060d',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="stat-card glass"
          style={{ ['--stat-glow' as string]: item.glow }}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className="stat-icon"
              style={{
                background: item.chip,
                color: item.chipText,
                ['--stat-glow' as string]: item.glow,
              }}
            >
              {item.icon}
            </span>
          </div>
          <p className="queue-ticket-number mt-3 text-3xl font-bold text-white">{item.value}</p>
          <p className="mt-1 text-xs tracking-wider text-slate-400 uppercase">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Radial chart beban harian: porsi antrean yang sudah selesai vs tersisa.
 * SVG donut ringan (tanpa library) dengan glow neon.
 */
export function DailyLoadChart({ stats }: { stats: DailyStatsDto | null }): ReactNode {
  const served = stats?.servedToday ?? 0;
  const remaining = stats?.remainingActive ?? 0;
  const total = served + remaining;
  const ratio = total === 0 ? 0 : served / total;

  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div className="glass flex items-center gap-5 rounded-3xl p-5">
      <div className="relative size-32 shrink-0">
        <svg viewBox="0 0 128 128" className="size-32 -rotate-90">
          <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(148,163,184,.15)" strokeWidth="12" />
          <motion.circle
            cx="64"
            cy="64"
            r={R}
            fill="none"
            stroke="url(#dailyLoadGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={false}
            animate={{ strokeDashoffset: C * (1 - ratio) }}
            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
            style={{ filter: 'drop-shadow(0 0 8px rgba(255,122,0,.7))' }}
          />
          <defs>
            <linearGradient id="dailyLoadGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffb300" />
              <stop offset="55%" stopColor="#ff7a00" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="queue-ticket-number text-2xl font-bold text-white">
            {total === 0 ? '0%' : `${Math.round(ratio * 100)}%`}
          </span>
          <span className="text-[0.65rem] tracking-widest text-slate-400 uppercase">tuntas</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-semibold text-white">Beban harian</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {served} selesai dari {total} tiket hari ini
        </p>
        <div className="progress-track mt-3">
          <div className="progress-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="size-2 rounded-full bg-neon-emerald shadow-[0_0_8px_rgba(16,229,154,.9)]" />
            Selesai {served}
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="size-2 rounded-full bg-neon-cyan shadow-[0_0_8px_rgba(34,211,238,.9)]" />
            Tersisa {remaining}
          </span>
        </div>
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, CirclePlay, PhoneCall, SkipForward } from 'lucide-react';
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
        tone="accent"
        icon={<PhoneCall className="size-6" aria-hidden />}
        label="Panggil Selanjutnya"
        hint={waitingCount === 0 ? 'Antrean kosong' : `${waitingCount} menunggu`}
      />
      <BigButton
        onClick={onCallAgain}
        disabled={busy || !activeQueue}
        tone="ghost"
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
        tone="success"
        icon={<CheckCircle2 className="size-6" aria-hidden />}
        label="Selesai"
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
  accent: 'bg-queue-accent text-queue-bg hover:bg-queue-accent-strong',
  success: 'bg-queue-success text-queue-bg hover:bg-queue-success/85',
  danger: 'border border-queue-danger/40 bg-queue-danger/10 text-queue-danger hover:bg-queue-danger/20',
  ghost: 'border border-white/15 bg-white/5 text-white hover:bg-white/10',
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
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={`flex min-h-28 flex-col items-start justify-between gap-2 rounded-2xl p-5 text-left text-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]} ${className}`}
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      {hint ? <span className="text-xs font-normal opacity-70">{hint}</span> : null}
    </motion.button>
  );
}

export function DailyStatsPanel({ stats }: { stats: DailyStatsDto | null }): ReactNode {
  if (!stats) {
    return null;
  }

  const items = [
    { label: 'Dilayani hari ini', value: stats.servedToday },
    { label: 'Antrean tersisa', value: stats.remainingActive },
    { label: 'Rata-rata tunggu', value: stats.averageWaitMinutes ?? '-' },
    { label: 'Dilewati', value: stats.skippedToday },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-white/10 bg-queue-surface/60 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">{item.label}</p>
          <p className="queue-ticket-number mt-2 text-2xl font-semibold text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
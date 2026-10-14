import type { ReactNode } from 'react';

/** Pasangan gradasi avatar berdasarkan hash nama — deterministik per pelanggan. */
const GRADIENTS: ReadonlyArray<{ bg: string; ring: string }> = [
  { bg: 'linear-gradient(135deg,#ff7a00,#ff2d78)', ring: 'rgba(255,122,0,.65)' },
  { bg: 'linear-gradient(135deg,#22d3ee,#3b82f6)', ring: 'rgba(34,211,238,.65)' },
  { bg: 'linear-gradient(135deg,#10e59a,#0ea5e9)', ring: 'rgba(16,229,154,.65)' },
  { bg: 'linear-gradient(135deg,#a78bfa,#ec4899)', ring: 'rgba(167,139,250,.65)' },
  { bg: 'linear-gradient(135deg,#fbbf24,#f97316)', ring: 'rgba(251,191,36,.65)' },
  { bg: 'linear-gradient(135deg,#34d399,#14b8a6)', ring: 'rgba(52,211,153,.65)' },
];

function pickGradient(name: string): { bg: string; ring: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return GRADIENTS[hash % GRADIENTS.length] ?? { bg: GRADIENTS[0]?.bg ?? '#ff7a00', ring: GRADIENTS[0]?.ring ?? 'rgba(255,122,0,.65)' };
}

/** Inisial dari nama, mis. "Budi Santoso" -> "BS". */
export function initialsOf(name: string | null | undefined): string {
  if (!name || !name.trim()) {
    return '?';
  }
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((w) => (w.charAt(0) ?? '?').toUpperCase()).join('');
}

/** Foto profil pelanggan (avatar inisial dengan ring neon). */
export function Avatar({
  name,
  size = 'md',
}: {
  name: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}): ReactNode {
  const gradient = pickGradient(name ?? 'anonim');
  const dims =
    size === 'lg' ? 'size-14 text-xl' : size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm';

  return (
    <span
      aria-hidden
      className={`avatar ${dims}`}
      style={{
        background: gradient.bg,
        ['--avatar-ring' as string]: gradient.ring,
      }}
    >
      {initialsOf(name)}
    </span>
  );
}

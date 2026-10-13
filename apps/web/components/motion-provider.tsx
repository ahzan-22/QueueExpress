'use client';

import type { ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';

/**
 * Provider animasi global (TASK-09 Audio & Visual Polish).
 * `reducedMotion="user"` membuat SEMUA animasi Framer Motion menghormati
 * preferensi OS `prefers-reduced-motion` secara otomatis.
 */
export function MotionProvider({ children }: { children: ReactNode }): ReactNode {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

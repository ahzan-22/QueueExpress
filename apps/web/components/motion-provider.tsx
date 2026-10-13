'use client';

import type { ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';

/**
 * Provider animasi global (TASK-09 Audio & Visual Polish).
 * `reducedMotion="user"` membuat SEMUA animasi Framer Motion menghormati
 * preferensi OS `prefers-reduced-motion` secara otomatis.
 * Default spring yang kaku + cepat membuat tombol terasa instan, bukan melayang.
 */
export function MotionProvider({ children }: { children: ReactNode }): ReactNode {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 550, damping: 34 }}>
      {children}
    </MotionConfig>
  );
}

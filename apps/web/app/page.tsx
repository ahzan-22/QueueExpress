'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, MonitorPlay, QrCode, Smartphone, Sparkles, Zap } from 'lucide-react';

const features = [
  {
    icon: QrCode,
    title: 'Tiket lewat QR Code',
    body: 'Pelanggan cukup scan dan langsung dapat nomor. Tidak perlu daftar, tidak perlu unduh aplikasi.',
    chip: 'linear-gradient(135deg,#ff7a00,#ff2d78)',
    glow: 'rgba(255,122,0,.7)',
  },
  {
    icon: Smartphone,
    title: 'Status antrean real-time',
    body: 'Nomor yang sedang dilayani, sisa antrean, dan estimasi waktu tunggu di layar HP.',
    chip: 'linear-gradient(135deg,#22d3ee,#3b82f6)',
    glow: 'rgba(34,211,238,.7)',
  },
  {
    icon: BarChart3,
    title: 'Dashboard operator',
    body: 'Tombol panggil, ulang, selesai, dan lewati dalam satu ketukan. Statistik harian otomatis.',
    chip: 'linear-gradient(135deg,#10e59a,#0ea5e9)',
    glow: 'rgba(16,229,154,.7)',
  },
  {
    icon: MonitorPlay,
    title: 'TV Display Board',
    body: 'Layar antrean yang estetik untuk ruang tunggu, lengkap dengan pengumuman suara.',
    chip: 'linear-gradient(135deg,#a78bfa,#ec4899)',
    glow: 'rgba(167,139,250,.7)',
  },
];

const links = [
  { href: '/queue?store=antri-lokal-demo', label: 'Ambil Tiket', primary: true },
  { href: '/operator', label: 'Dashboard Operator', primary: false },
  { href: '/display/antri-lokal-demo', label: 'TV Display Board', primary: false },
];

export default function HomePage(): ReactNode {
  return (
    <main className="queue-backdrop cyber-grid min-h-dvh">
      <section className="relative mx-auto flex max-w-5xl flex-col gap-10 px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex flex-col gap-4"
        >
          <span className="glass inline-flex w-fit items-center gap-2 rounded-full border-neon-amber/40 px-4 py-1.5 text-sm text-[#ffc24b]">
            <Sparkles className="size-4" aria-hidden />
            Antrean digital untuk UMKM lokal
          </span>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-6xl">
            QueueExpress
            <span className="text-neon-gradient block">AntriLokal</span>
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">
            Sistem antrean real-time berbasis web-first. Pelanggan tidak perlu mengunduh aplikasi,
            cukup scan QR Code dan memantau gilirannya dari HP.
          </p>
        </motion.div>

        <motion.nav
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          className="flex flex-wrap gap-3"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                link.primary
                  ? 'btn-neon btn-amber inline-flex items-center gap-2 rounded-xl px-5 py-3 font-bold'
                  : 'btn-neon btn-ghost-neon inline-flex items-center gap-2 rounded-xl px-5 py-3 font-medium'
              }
            >
              {link.label}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          ))}
        </motion.nav>

        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature, index) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + index * 0.07, ease: 'easeOut' }}
              className="glass stat-card"
              style={{ ['--stat-glow' as string]: feature.glow }}
            >
              <span
                className="stat-icon"
                style={{
                  background: feature.chip,
                  color: '#fff',
                  ['--stat-glow' as string]: feature.glow,
                }}
              >
                <feature.icon className="size-5" aria-hidden />
              </span>
              <h2 className="font-display mt-4 text-xl font-semibold text-white">{feature.title}</h2>
              <p className="mt-2 text-slate-300">{feature.body}</p>
            </motion.article>
          ))}
        </div>

        
      </section>
    </main>
  );
}

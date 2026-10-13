'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, MonitorPlay, QrCode, Smartphone, Sparkles } from 'lucide-react';

const features = [
  {
    icon: QrCode,
    title: 'Tiket lewat QR Code',
    body: 'Pelanggan cukup scan dan langsung dapat nomor. Tidak perlu daftar, tidak perlu unduh aplikasi.',
  },
  {
    icon: Smartphone,
    title: 'Status antrean real-time',
    body: 'Nomor yang sedang dilayani, sisa antrean, dan estimasi waktu tunggu di layar HP.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard operator',
    body: 'Tombol panggil, ulang, selesai, dan lewati dalam satu ketukan. Statistik harian otomatis.',
  },
  {
    icon: MonitorPlay,
    title: 'TV Display Board',
    body: 'Layar antrean yang estetik untuk ruang tunggu, lengkap dengan pengumuman suara.',
  },
];

const links = [
  { href: '/operator', label: 'Dashboard Operator' },
  { href: '/display/antri-lokal-demo', label: 'TV Display Board' },
  { href: '/demo', label: 'Demo Dual-Screen' },
];

export default function HomePage(): ReactNode {
  return (
    <main className="queue-backdrop min-h-dvh">
      <section className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex flex-col gap-4"
        >
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-queue-accent/40 bg-queue-accent/10 px-4 py-1.5 text-sm text-queue-accent">
            <Sparkles className="size-4" aria-hidden />
            Antrean digital untuk UMKM lokal
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            QueueExpress
            <span className="block text-queue-accent">AntriLokal</span>
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
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-medium text-white transition hover:bg-white/10"
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
              className="rounded-2xl border border-white/10 bg-queue-surface/60 p-6"
            >
              <feature.icon className="size-6 text-queue-accent" aria-hidden />
              <h2 className="mt-4 text-xl font-semibold text-white">{feature.title}</h2>
              <p className="mt-2 text-slate-300">{feature.body}</p>
            </motion.article>
          ))}
        </div>

        <section className="rounded-2xl border border-white/10 bg-black/30 p-6">
          <h2 className="text-lg font-semibold text-white">Belum punya toko demo?</h2>
          <p className="mt-2 text-sm text-slate-300">
            Jalankan <code className="text-queue-accent">bun run db:seed</code> untuk membuat store
            contoh beserta layanan dan tiket menunggu. Rute lengkapnya ada di PRD.md section 4.4.
          </p>
        </section>
      </section>
    </main>
  );
}
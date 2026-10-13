'use client';

import { Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { TicketCheck } from 'lucide-react';
import { createTicket, getStore, type StoreWithServices } from '@/lib/api';

/**
 * Landing setelah scan QR Code (PRD section A.1).
 * Pelanggan memilih layanan, lalu diarahkan ke /queue/{ticketId}
 * supaya URL bisa di-bookmark atau dibagikan.
 *
 * useSearchParams() membuat halaman ini client-only, jadi dibungkus Suspense
 * agar Next.js tetap bisa men-render ulang route ini saat build.
 */
export default function QueueEntryPage(): ReactNode {
  return (
    <Suspense fallback={<Fallback />}>
      <QueueEntry />
    </Suspense>
  );
}

function QueueEntry(): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeSlug = searchParams.get('store') ?? 'antri-lokal-demo';

  const [store, setStore] = useState<StoreWithServices | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serviceId, setServiceId] = useState<string | undefined>(
    searchParams.get('service') ?? undefined,
  );

  useEffect(() => {
    getStore(storeSlug)
      .then((data) => {
        setStore(data);
        setServiceId((current) => current ?? data.services[0]?.id);
      })
      .catch((cause: unknown) => setError(String(cause)));
  }, [storeSlug]);

  const handleTakeTicket = async (): Promise<void> => {
    setSubmitting(true);
    setError(null);

    try {
      const ticket = await createTicket(storeSlug, { serviceId });
      router.push(`/queue/${ticket.id}`);
    } catch (cause) {
      setError(String(cause));
      setSubmitting(false);
    }
  };

  return (
    <main className="queue-backdrop flex min-h-dvh items-center justify-center p-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-queue-surface/70 p-6 backdrop-blur"
      >
        <div className="flex items-center gap-3">
          <TicketCheck className="size-6 text-queue-accent" aria-hidden />
          <div>
            <h1 className="text-xl font-semibold text-white">{store?.name ?? 'Memuat toko...'}</h1>
            <p className="text-sm text-slate-400">Pilih layanan, lalu ambil nomor antrean.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-2">
          {(store?.services ?? []).map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => setServiceId(service.id)}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                serviceId === service.id
                  ? 'border-queue-accent bg-queue-accent/10 text-white'
                  : 'border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              <span className="font-medium">{service.name}</span>
              <span className="text-sm text-slate-400">~{service.estMinutes} mnt</span>
            </button>
          ))}
        </div>

        {error ? <p className="mt-4 text-sm text-queue-danger">{error}</p> : null}

        <button
          type="button"
          onClick={() => void handleTakeTicket()}
          disabled={submitting || !serviceId}
          className="mt-6 w-full rounded-2xl bg-queue-accent py-4 text-lg font-semibold text-queue-bg transition hover:bg-queue-accent-strong disabled:opacity-40"
        >
          {submitting ? 'Membuat tiket...' : 'Ambil Nomor Antrean'}
        </button>
      </motion.section>
    </main>
  );
}

function Fallback(): ReactNode {
  return (
    <main className="queue-backdrop flex min-h-dvh items-center justify-center p-6">
      <p className="rounded-3xl border border-white/10 bg-queue-surface/70 px-6 py-4 text-slate-300">
        Memuat halaman antrean...
      </p>
    </main>
  );
}
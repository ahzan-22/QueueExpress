import { config as loadEnv } from 'dotenv';
import { getDb } from './client';

// DATABASE_URL berada di .env pada root monorepo (lihat .env.example)
loadEnv({ path: '../../.env' });
loadEnv();

const prisma = getDb();

/**
 * Seed data awal: satu toko demo + dua jenis layanan (multi-service selection,
 * PRD section B.2) + beberapa tiket waiting supaya dashboard operator dan
 * TV display langsung punya isi saat pertama dijalankan.
 *
 * Aman dijalankan berulang kali (idempotent).
 */
async function main(): Promise<void> {
  const store = await prisma.store.upsert({
    where: { slug: 'antri-lokal-demo' },
    update: {},
    create: {
      name: 'Barbershop AntriLokal Demo',
      slug: 'antri-lokal-demo',
      address: 'Jl. Contoh No. 1, Jakarta',
    },
  });

  const serviceNames = [
    { name: 'Cukur Kilat', estMinutes: 15 },
    { name: 'Cukur + Cuci', estMinutes: 30 },
  ];

  const services = [];

  for (const service of serviceNames) {
    const slug = service.name.toLowerCase().replace(/[^a-z]+/g, '-');

    services.push(
      await prisma.service.upsert({
        where: { id: `${store.id}-${slug}` },
        update: { estMinutes: service.estMinutes, name: service.name },
        create: {
          id: `${store.id}-${slug}`,
          storeId: store.id,
          name: service.name,
          estMinutes: service.estMinutes,
        },
      }),
    );
  }

  const existing = await prisma.queue.count({ where: { storeId: store.id } });

  if (existing === 0) {
    const now = Date.now();

    await prisma.queue.createMany({
      data: services.flatMap((service, serviceIndex) =>
        Array.from({ length: 3 }, (_, i) => ({
          storeId: store.id,
          serviceId: service.id,
          ticketNum: `${serviceIndex === 0 ? 'A' : 'B'}-${String(i + 1).padStart(3, '0')}`,
          customerName: ['Budi', 'Sari', 'Dimas'][i] ?? null,
          createdAt: new Date(now + (serviceIndex * 3 + i) * 60_000),
        })),
      ),
    });
  }

  const queues = await prisma.queue.count({ where: { storeId: store.id } });

  process.stdout.write(
    [
      'Seed selesai.',
      `  store  : ${store.name} (/display/${store.slug})`,
      `  layanan: ${services.map((s) => `${s.name} ~${s.estMinutes}mnt`).join(', ')}`,
      `  tiket  : ${queues} baris`,
      '',
    ].join('\n'),
  );
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Seed gagal: ${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
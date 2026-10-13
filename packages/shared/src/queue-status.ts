/**
 * Status siklus hidup tiket antrean.
 *
 * Sengaja ditulis sebagai const object + union type (bukan `enum`) supaya
 * type-nya identik dengan enum yang di-generate Prisma di packages/db.
 * Dengan begitu `row.status` dari Prisma bisa langsung dikirim ke DTO shared
 * tanpa casting manual.
 *
 * Harus tetap sinkron dengan enum QueueStatus di packages/db/prisma/schema.prisma.
 */
export const QueueStatus = {
  WAITING: 'WAITING',
  CALLED: 'CALLED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
  CANCELLED: 'CANCELLED',
} as const;

export type QueueStatus = (typeof QueueStatus)[keyof typeof QueueStatus];

/** Status yang masih aktif dan menempati antrean (belum selesai). */
export const ACTIVE_QUEUE_STATUSES = [
  QueueStatus.WAITING,
  QueueStatus.CALLED,
  QueueStatus.PROCESSING,
] as const satisfies readonly QueueStatus[];

/** Urutan prioritas saat memilih "panggilan berikutnya". */
export const QUEUE_PRIORITY: Record<QueueStatus, number> = {
  [QueueStatus.WAITING]: 0,
  [QueueStatus.CALLED]: 1,
  [QueueStatus.PROCESSING]: 2,
  [QueueStatus.COMPLETED]: 3,
  [QueueStatus.SKIPPED]: 4,
  [QueueStatus.CANCELLED]: 5,
};
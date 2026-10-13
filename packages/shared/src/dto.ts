import type { QueueStatus } from './queue-status';

/** Entitas yang dikirim ke client (hasil serialisasi Prisma). */
export interface StoreDto {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  qrCodeUrl: string | null;
}

export interface ServiceDto {
  id: string;
  storeId: string;
  name: string;
  estMinutes: number;
}

export interface QueueDto {
  id: string;
  storeId: string;
  serviceId: string;
  ticketNum: string;
  customerName: string | null;
  status: QueueStatus;
  createdAt: string;
  calledAt: string | null;
  completedAt: string | null;
}

/**
 * Ticket yang disiapkan khusus untuk kartu status pelanggan.
 * Mengandung semua yang dibutuhkan layar /queue/[ticketId] tanpa query tambahan.
 */
export interface TicketViewDto {
  ticket: QueueDto;
  store: StoreDto;
  service: ServiceDto;
  /** Nomor yang sedang dilayani sekarang. */
  currentlyServing: string | null;
  /** Estimasi waktu tunggu dalam menit (null bila tidak bisa dihitung). */
  estimatedWaitMinutes: number | null;
  /** Berapa banyak tiket aktif di depan tiket ini. */
  aheadCount: number;
  /** 1 -> giliran berikutnya (mode bersiap / "siap"). null -> belum dekat. */
  positionsUntilCall: number | null;
}

/** Ringkasan untuk TV Display Board. */
export interface DisplayBoardDto {
  store: StoreDto;
  service: ServiceDto | null;
  currentlyServing: QueueDto | null;
  upcoming: QueueDto[];
  servedToday: number;
  updatedAt: string;
}

/** Statistik harian untuk Operator Dashboard (PRD section B.3). */
export interface DailyStatsDto {
  storeId: string;
  date: string;
  servedToday: number;
  skippedToday: number;
  remainingActive: number;
  averageWaitMinutes: number | null;
  averageServiceMinutes: number | null;
}

/** Aksi One-Tap Queue Controls (PRD section B.1). */
export type QueueAction =
  | { type: 'CALL_NEXT' }
  | { type: 'CALL_AGAIN'; queueId: string }
  | { type: 'COMPLETE'; queueId: string }
  | { type: 'SKIP'; queueId: string }
  | { type: 'START'; queueId: string };
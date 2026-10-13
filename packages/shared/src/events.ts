/**
 * Kontrak event Socket.IO. Dipakai bersama oleh gateway NestJS (server)
 * dan hook React (client) agar tidak ada typo nama event.
 *
 * Penamaan mengikuti PRD Phase 2: queue:created, queue:called, queue:completed.
 */
export const SOCKET_EVENTS = {
  /** Client -> Server: register ke room store. */
  SUBSCRIBE_STORE: 'store:subscribe',
  UNSUBSCRIBE_STORE: 'store:unsubscribe',
  /** Client -> Server: operator mengambil alih (mengunci) room store. */
  LOCK_OPERATOR: 'operator:lock',
  /** Client -> Server: aksi one-tap dari dashboard operator. */
  QUEUE_ACTION: 'queue:action',

  /** Server -> Client. */
  QUEUE_CREATED: 'queue:created',
  QUEUE_CALLED: 'queue:called',
  QUEUE_COMPLETED: 'queue:completed',
  QUEUE_SKIPPED: 'queue:skipped',
  QUEUE_UPDATED: 'queue:updated',
  DISPLAY_REFRESH: 'display:refresh',
  STATS_UPDATED: 'stats:updated',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** Room Socket.IO = `store:{storeId}`. */
export const storeRoom = (storeId: string): string => `store:${storeId}`;

export interface SubscribeStorePayload {
  storeId: string;
}

export interface UnsubscribeStorePayload {
  storeId: string;
}

export interface LockOperatorPayload {
  storeId: string;
  /** Token sederhana untuk mencegah dua operator menjalankan satu toko. */
  operatorKey?: string;
}

export interface QueueEventPayload {
  storeId: string;
  queueId: string;
  ticketNum: string;
  status: string;
  at: string;
}

export interface DisplayRefreshPayload {
  storeId: string;
  reason: string;
}
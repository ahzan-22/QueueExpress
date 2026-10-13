import type {
  DailyStatsDto,
  DisplayBoardDto,
  TicketViewDto,
} from '@queueexpress/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

export const config = {
  apiUrl: API_URL,
  apiBase: `${API_URL}/api`,
  socketUrl: `${SOCKET_URL}/queue`,
};

export type Service = {
  id: string;
  storeId: string;
  name: string;
  estMinutes: number;
};

export type Store = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  qrCodeUrl: string | null;
};

export type StoreWithServices = Store & { services: Service[] };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Timeout 8 detik agar tombol tidak menggantung saat API lambat.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(`${config.apiBase}${path}`, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      cache: 'no-store',
      // Koneksi tetap hidup antar request — mengurangi handshake TCP/TLS.
      keepalive: true,
    });

    if (!response.ok) {
      throw new Error(`API ${response.status}: ${await response.text()}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Dedupe GET yang sama jika dipanggil berbarengan (mis. 3 event WS datang
 * sekaligus: queue:called + display:refresh + stats:updated). Request kedua
 * memakai promise yang sedang berjalan, bukan fetch baru.
 */
const inflight = new Map<string, Promise<unknown>>();

function dedupedGet<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }
  const promise = fetcher().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

const withService = (serviceId?: string): string => (serviceId ? `?serviceId=${serviceId}` : '');

export const getStores = (): Promise<StoreWithServices[]> => request<StoreWithServices[]>('/stores');

export const getStore = (slug: string): Promise<StoreWithServices> =>
  request<StoreWithServices>(`/stores/${slug}`);

export const createTicket = (storeSlug: string, body: { serviceId?: string; customerName?: string }) =>
  request<{ id: string; ticketNum: string }>(`/stores/${storeSlug}/queue/tickets`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const getTicketView = (ticketId: string): Promise<TicketViewDto> =>
  request<TicketViewDto>(`/tickets/${ticketId}`);

export const getDisplayBoard = (storeSlug: string, serviceId?: string): Promise<DisplayBoardDto> =>
  dedupedGet(`display:${storeSlug}:${serviceId ?? '-'}`, () =>
    request<DisplayBoardDto>(`/stores/${storeSlug}/queue/display${withService(serviceId)}`),
  );

export const getDailyStats = (storeSlug: string, serviceId?: string): Promise<DailyStatsDto> =>
  dedupedGet(`stats:${storeSlug}:${serviceId ?? '-'}`, () =>
    request<DailyStatsDto>(`/stores/${storeSlug}/queue/stats${withService(serviceId)}`),
  );

export const callNext = (storeSlug: string, serviceId?: string): Promise<unknown> =>
  request<unknown>(`/stores/${storeSlug}/queue/call-next`, {
    method: 'POST',
    body: JSON.stringify({ serviceId }),
  });

export type TicketAction = 'call-again' | 'start' | 'complete' | 'skip' | 'cancel';

export const ticketAction = (ticketId: string, action: TicketAction): Promise<unknown> =>
  request<unknown>(`/tickets/${ticketId}/${action}`, { method: 'POST' });

/** Hapus permanen satu tiket yang tertahan (hard delete). */
export const deleteTicket = (ticketId: string): Promise<{ id: string; ticketNum: string; deleted: boolean }> =>
  request<{ id: string; ticketNum: string; deleted: boolean }>(`/tickets/${ticketId}`, {
    method: 'DELETE',
  });

/** Tambah antrean manual oleh operator (walk-in). */
export const createManualTicket = (
  storeSlug: string,
  body: { serviceId?: string; customerName?: string },
): Promise<{ id: string; ticketNum: string }> =>
  request<{ id: string; ticketNum: string }>(`/stores/${storeSlug}/queue/manual`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

/** Reset antrean harian — hapus semua tiket, nomor kembali ke A-001. */
export const resetDailyQueue = (
  storeSlug: string,
): Promise<{ storeId: string; storeSlug: string; deleted: number; resetAt: string }> =>
  request<{ storeId: string; storeSlug: string; deleted: number; resetAt: string }>(
    `/stores/${storeSlug}/queue/reset`,
    { method: 'POST', body: JSON.stringify({}) },
  );
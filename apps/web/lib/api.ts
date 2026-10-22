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

/**
 * Render free tier mematikan service setelah 15 menit idle. Request pertama
 * setelah itu harus menunggu container bangun (~30–60 detik), jadi timeout
 * per percobaan dinaikkan agar tidak putus di tengah cold start.
 */
const REQUEST_TIMEOUT_MS = 65_000;
const RETRY_DELAY_MS = 1_000;

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Error jaringan / timeout boleh diulang; error HTTP (4xx/5xx) tidak. */
const isRetryable = (error: unknown): boolean =>
  error instanceof TypeError || (error instanceof Error && error.name === 'AbortError');

async function attemptRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
      throw new ApiError(`API ${response.status}: ${await response.text()}`, response.status);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  // POST/PATCH/DELETE tidak diulang supaya tidak membuat data ganda
  // (mis. tiket tercetak dua kali) saat server lambat merespons.
  const maxAttempts = method === 'GET' ? 2 : 1;

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await attemptRequest<T>(path, init);
    } catch (error) {
      if (attempt >= maxAttempts || !isRetryable(error)) {
        throw error;
      }
      await sleep(RETRY_DELAY_MS);
    }
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
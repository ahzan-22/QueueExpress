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
  const response = await fetch(`${config.apiBase}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as T;
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
  request<DisplayBoardDto>(`/stores/${storeSlug}/queue/display${withService(serviceId)}`);

export const getDailyStats = (storeSlug: string, serviceId?: string): Promise<DailyStatsDto> =>
  request<DailyStatsDto>(`/stores/${storeSlug}/queue/stats${withService(serviceId)}`);

export const callNext = (storeSlug: string, serviceId?: string): Promise<unknown> =>
  request<unknown>(`/stores/${storeSlug}/queue/call-next`, {
    method: 'POST',
    body: JSON.stringify({ serviceId }),
  });

export type TicketAction = 'call-again' | 'start' | 'complete' | 'skip' | 'cancel';

export const ticketAction = (ticketId: string, action: TicketAction): Promise<unknown> =>
  request<unknown>(`/tickets/${ticketId}/${action}`, { method: 'POST' });
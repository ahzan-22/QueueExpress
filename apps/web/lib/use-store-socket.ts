'use client';

import { useEffect, useRef, useState } from 'react';
import { SOCKET_EVENTS, type SocketEventName } from '@queueexpress/shared';
import { io, type Socket } from 'socket.io-client';
import { config } from './api';

export type ConnectionState = 'connecting' | 'online' | 'offline';

/**
 * Satu koneksi Socket.IO per komponen yang memanggilnya, otomatis subscribe ke
 * room store dan otomatis unsubscribe saat unmount.
 */
export function useStoreSocket(
  storeId: string | null,
  onEvent?: (event: SocketEventName) => void,
): { connected: boolean; state: ConnectionState } {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<ConnectionState>('connecting');
  // Simpan callback terbaru di ref agar listener socket selalu memanggil
  // versi segar tanpa perlu re-subscribe setiap render.
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!storeId) {
      return;
    }

    const socket = io(config.socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 800,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setState('online');
      socket.emit(SOCKET_EVENTS.SUBSCRIBE_STORE, { storeId });
    });

    socket.on('disconnect', () => setState('offline'));
    socket.on('connect_error', () => setState('offline'));

    // Hanya event server -> client yang memicu refresh. Event client -> server
    // (SUBSCRIBE_STORE, UNSUBSCRIBE_STORE, LOCK_OPERATOR, QUEUE_ACTION) tidak
    // pernah di-broadcast server sehingga tidak perlu di-listen.
    const broadcastEvents: SocketEventName[] = [
      SOCKET_EVENTS.QUEUE_CREATED,
      SOCKET_EVENTS.QUEUE_CALLED,
      SOCKET_EVENTS.QUEUE_COMPLETED,
      SOCKET_EVENTS.QUEUE_SKIPPED,
      SOCKET_EVENTS.QUEUE_UPDATED,
      SOCKET_EVENTS.DISPLAY_REFRESH,
      SOCKET_EVENTS.STATS_UPDATED,
    ];

    for (const eventName of broadcastEvents) {
      socket.on(eventName, () => onEventRef.current?.(eventName));
    }

    return () => {
      try {
        socket.emit(SOCKET_EVENTS.UNSUBSCRIBE_STORE, { storeId });
      } catch {
        // abaikan — socket mungkin sudah terputus
      }
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [storeId]);

  return { connected: state === 'online', state };
}
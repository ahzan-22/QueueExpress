import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  SOCKET_EVENTS,
  storeRoom,
  type LockOperatorPayload,
  type SubscribeStorePayload,
  type UnsubscribeStorePayload,
} from '@queueexpress/shared';
import type { Server, Socket } from 'socket.io';

const allowedOrigins = (): string[] | true => {
  const raw = process.env['WEB_ORIGIN'];

  if (!raw) {
    return true;
  }

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

/**
 * Gateway Socket.IO (PRD Phase 2).
 *
 * Gateway ini sengaja hanya menangani subscribe/broadcast. Aksi operator
 * (panggil / selesai / lewati) tetap lewat REST endpoint supaya tidak ada
 * circular dependency antara QueueService dan RealtimeModule.
 */
@WebSocketGateway({
  namespace: '/queue',
  cors: { origin: allowedOrigins(), credentials: true },
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(QueueGateway.name);

  @WebSocketServer()
  private server!: Server;

  handleConnection(client: Socket): void {
    this.logger.log(`Client terhubung: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client terputus: ${client.id}`);
  }

  @SubscribeMessage(SOCKET_EVENTS.SUBSCRIBE_STORE)
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribeStorePayload,
  ): { ok: true; room: string } {
    const room = storeRoom(payload.storeId);
    void client.join(room);
    return { ok: true, room };
  }

  @SubscribeMessage(SOCKET_EVENTS.UNSUBSCRIBE_STORE)
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UnsubscribeStorePayload,
  ): { ok: true; left: string } {
    const room = storeRoom(payload.storeId);
    void client.leave(room);
    return { ok: true, left: room };
  }

  @SubscribeMessage(SOCKET_EVENTS.LOCK_OPERATOR)
  handleLockOperator(
    @MessageBody() payload: LockOperatorPayload,
  ): { ok: true; locked: boolean } {
    // Token operator belum dipakai di Phase 1-2. Disiapkan agar satu toko
    // tidak bisa dikendalikan dua operator sekaligus pada tahap berikutnya.
    return { ok: true, locked: Boolean(payload.operatorKey) };
  }

  broadcastToStore(
    storeId: string,
    event: (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS],
    payload: unknown,
  ): void {
    if (!this.server) {
      return;
    }

    this.server.to(storeRoom(storeId)).emit(event, payload);
  }
}
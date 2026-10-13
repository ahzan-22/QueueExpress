import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ACTIVE_QUEUE_STATUSES,
  QueueStatus,
  SOCKET_EVENTS,
  type DailyStatsDto,
  type DisplayBoardDto,
  type QueueDto,
  type TicketViewDto,
} from '@queueexpress/shared';
import { Prisma } from '@queueexpress/db';
import { PrismaService } from '../prisma/prisma.service';
import { QueueGateway } from '../realtime/queue.gateway';
import { StoresService } from '../stores/stores.service';
import type { CallNextDto, CreateTicketDto } from './dto/queue.dto';

const MAX_TICKET_NUM_RETRY = 5;
const UPCOMING_COUNT = 5;

/** Kolom Queue tanpa relasi, dipakai untuk serialisasi ke DTO. */
type QueueBase = {
  id: string;
  storeId: string;
  serviceId: string;
  ticketNum: string;
  customerName: string | null;
  status: QueueStatus;
  createdAt: Date;
  calledAt: Date | null;
  completedAt: Date | null;
};

/** Baris Queue yang sudah di-join dengan store dan service. */
type QueueRow = QueueBase & {
  store: { id: string; name: string; slug: string; address: string | null; qrCodeUrl: string | null };
  service: { id: string; storeId: string; name: string; estMinutes: number };
};

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly gateway: QueueGateway,
  ) {}

  // ------------------------------------------------------------------
  // Utilitas
  // ------------------------------------------------------------------

  private toDto(row: QueueBase): QueueDto {
    return {
      id: row.id,
      storeId: row.storeId,
      serviceId: row.serviceId,
      ticketNum: row.ticketNum,
      customerName: row.customerName,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      calledAt: row.calledAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
    };
  }

  /** Prefix 2 huruf dari nama layanan, mis. "Cukur Kilat" -> "CK". */
  private prefixFromServiceName(name: string): string {
    const words = name
      .replace(/[^a-zA-Z\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    const prefix = words.map((word) => word.charAt(0).toUpperCase()).join('');

    return prefix.slice(0, 2).padEnd(2, 'X');
  }

  private async nextTicketNum(storeId: string, prefix: string, offset = 0): Promise<string> {
    const used = await this.prisma.db.queue.count({
      where: { storeId, ticketNum: { startsWith: prefix } },
    });

    return `${prefix}-${String(used + 1 + offset).padStart(3, '0')}`;
  }

  private async broadcastQueueEvent(
    row: QueueRow,
    event: (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS],
  ): Promise<void> {
    this.gateway.broadcastToStore(row.storeId, event, {
      storeId: row.storeId,
      queueId: row.id,
      ticketNum: row.ticketNum,
      status: row.status,
      at: new Date().toISOString(),
    });

    this.gateway.broadcastToStore(row.storeId, SOCKET_EVENTS.DISPLAY_REFRESH, {
      storeId: row.storeId,
      reason: event,
    });
  }

  // ------------------------------------------------------------------
  // Pembuatan tiket (PRD section A.1)
  // ------------------------------------------------------------------

  async createTicket(storeSlug: string, dto: CreateTicketDto): Promise<QueueRow> {
    const store = await this.stores.findBySlugOrFail(storeSlug);

    const services = await this.prisma.db.service.findMany({
      where: { storeId: store.id },
      orderBy: { estMinutes: 'asc' },
    });

    if (services.length === 0) {
      throw new BadRequestException(
        `Store "${storeSlug}" belum punya jenis layanan. Tambahkan lewat POST /stores/${storeSlug}/services.`,
      );
    }

    const service = dto.serviceId
      ? services.find((item) => item.id === dto.serviceId)
      : services[0];

    if (!service) {
      throw new BadRequestException(`Layanan "${dto.serviceId}" tidak terdaftar di store ini`);
    }

    const prefix = this.prefixFromServiceName(service.name);

    for (let attempt = 0; attempt < MAX_TICKET_NUM_RETRY; attempt += 1) {
      const ticketNum = await this.nextTicketNum(store.id, prefix, attempt);

      try {
        const created = await this.prisma.db.queue.create({
          data: {
            storeId: store.id,
            serviceId: service.id,
            ticketNum,
            customerName: dto.customerName,
            status: QueueStatus.WAITING,
          },
          include: { service: true, store: true },
        });

        await this.broadcastQueueEvent(created, SOCKET_EVENTS.QUEUE_CREATED);
        this.logger.log(`Tiket ${ticketNum} dibuat untuk ${storeSlug}`);

        return created;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          this.logger.warn(`Nomor tiket ${ticketNum} bentrok, mencoba ulang`);
          continue;
        }

        throw error;
      }
    }

    throw new BadRequestException('Gagal membuat nomor tiket, coba lagi sebentar.');
  }

  // ------------------------------------------------------------------
  // Pembacaan (PRD section A.2 dan C.3)
  // ------------------------------------------------------------------

  async listActive(storeSlug: string, serviceId?: string): Promise<QueueDto[]> {
    const store = await this.stores.findBySlugOrFail(storeSlug);

    const rows = await this.prisma.db.queue.findMany({
      where: {
        storeId: store.id,
        status: { in: [...ACTIVE_QUEUE_STATUSES] },
        ...(serviceId ? { serviceId } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => this.toDto(row));
  }

  async getTicketView(ticketId: string): Promise<TicketViewDto> {
    const ticket = await this.prisma.db.queue.findUnique({
      where: { id: ticketId },
      include: { service: true, store: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Tiket "${ticketId}" tidak ditemukan`);
    }

    const ahead = await this.prisma.db.queue.findMany({
      where: {
        storeId: ticket.storeId,
        serviceId: ticket.serviceId,
        status: { in: [...ACTIVE_QUEUE_STATUSES] },
        OR: [{ status: { in: [QueueStatus.CALLED, QueueStatus.PROCESSING] } }, { createdAt: { lt: ticket.createdAt } }],
      },
      orderBy: { createdAt: 'asc' },
      include: { service: true },
    });

    // Tiket sendiri tidak boleh dihitung sebagai "di depan".
    const aheadCount = ahead.filter((row) => row.id !== ticket.id).length;

    const estimatedWaitMinutes = ahead
      .filter((row) => row.id !== ticket.id)
      .reduce((total, row) => total + row.service.estMinutes, 0);

    const currentlyServing =
      (
        await this.prisma.db.queue.findFirst({
          where: {
            storeId: ticket.storeId,
            serviceId: ticket.serviceId,
            status: { in: [QueueStatus.CALLED, QueueStatus.PROCESSING] },
          },
          // Panggilan terbaru yang didahulukan: TV/kartu pelanggan harus
          // menampilkan nomor yang baru saja diumumkan, bukan tiket basi
          // yang belum diselesaikan operator.
          orderBy: { calledAt: 'desc' },
        })
      )?.ticketNum ?? null;

    return {
      ticket: this.toDto(ticket),
      store: {
        id: ticket.store.id,
        name: ticket.store.name,
        slug: ticket.store.slug,
        address: ticket.store.address,
        qrCodeUrl: ticket.store.qrCodeUrl,
      },
      service: {
        id: ticket.service.id,
        storeId: ticket.service.storeId,
        name: ticket.service.name,
        estMinutes: ticket.service.estMinutes,
      },
      currentlyServing,
      estimatedWaitMinutes,
      aheadCount,
      positionsUntilCall: aheadCount === 0 ? 1 : null,
    };
  }

  async getDisplayBoard(storeSlug: string, serviceId?: string): Promise<DisplayBoardDto> {
    const store = await this.stores.findBySlugOrFail(storeSlug);

    const service = serviceId
      ? store.services.find((item) => item.id === serviceId) ?? null
      : null;

    const scope = {
      storeId: store.id,
      ...(service ? { serviceId: service.id } : {}),
    };

    const currentlyServing = await this.prisma.db.queue.findFirst({
      where: { ...scope, status: { in: [QueueStatus.CALLED, QueueStatus.PROCESSING] } },
      // Panggilan terbaru yang didahulukan: TV harus menampilkan nomor yang
      // baru saja diumumkan, bukan tiket basi yang belum diselesaikan operator.
      orderBy: { calledAt: 'desc' },
    });

    const upcoming = await this.prisma.db.queue.findMany({
      where: { ...scope, status: QueueStatus.WAITING },
      orderBy: { createdAt: 'asc' },
      take: UPCOMING_COUNT,
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const servedToday =
      (await this.prisma.db.queue.count({
        where: {
          ...scope,
          status: QueueStatus.COMPLETED,
          completedAt: { gte: startOfDay },
        },
      })) +
      (await this.prisma.db.queue.count({
        where: { ...scope, status: QueueStatus.PROCESSING },
      }));

    return {
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        address: store.address,
        qrCodeUrl: store.qrCodeUrl,
      },
      service,
      currentlyServing: currentlyServing ? this.toDto(currentlyServing) : null,
      upcoming: upcoming.map((row) => this.toDto(row)),
      servedToday,
      updatedAt: new Date().toISOString(),
    };
  }

  // ------------------------------------------------------------------
  // One-Tap Queue Controls (PRD section B.1)
  // ------------------------------------------------------------------

  async callNext(storeSlug: string, dto: CallNextDto): Promise<QueueRow> {
    const store = await this.stores.findBySlugOrFail(storeSlug);

    const next = await this.prisma.db.queue.findFirst({
      where: {
        storeId: store.id,
        ...(dto.serviceId ? { serviceId: dto.serviceId } : {}),
        status: QueueStatus.WAITING,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!next) {
      throw new BadRequestException(`Tidak ada antrean menunggu di store "${storeSlug}"`);
    }

    const called = await this.prisma.db.queue.update({
      where: { id: next.id },
      data: { status: QueueStatus.CALLED, calledAt: new Date() },
      include: { service: true, store: true },
    });

    await this.broadcastQueueEvent(called, SOCKET_EVENTS.QUEUE_CALLED);
    this.logger.log(`Memanggil tiket ${called.ticketNum}`);

    return called;
  }

  /** Mengirim ulang pemicu audio/visual ke TV dan HP pelanggan. */
  async callAgain(ticketId: string): Promise<QueueRow> {
    const ticket = await this.requireQueue(ticketId);

    const recalled = await this.prisma.db.queue.update({
      where: { id: ticket.id },
      data: { status: QueueStatus.CALLED, calledAt: ticket.calledAt ?? new Date() },
      include: { service: true, store: true },
    });

    await this.broadcastQueueEvent(recalled, SOCKET_EVENTS.QUEUE_CALLED);
    this.gateway.broadcastToStore(recalled.storeId, SOCKET_EVENTS.QUEUE_UPDATED, {
      storeId: recalled.storeId,
      queueId: recalled.id,
      ticketNum: recalled.ticketNum,
      status: recalled.status,
      recalled: true,
      at: new Date().toISOString(),
    });

    return recalled;
  }

  async start(ticketId: string): Promise<QueueRow> {
    const ticket = await this.requireQueue(ticketId);

    const started = await this.prisma.db.queue.update({
      where: { id: ticket.id },
      data: { status: QueueStatus.PROCESSING },
      include: { service: true, store: true },
    });

    await this.broadcastQueueEvent(started, SOCKET_EVENTS.QUEUE_UPDATED);

    return started;
  }

  async complete(ticketId: string): Promise<QueueRow> {
    const ticket = await this.requireQueue(ticketId);

    const completed = await this.prisma.db.queue.update({
      where: { id: ticket.id },
      data: { status: QueueStatus.COMPLETED, completedAt: new Date() },
      include: { service: true, store: true },
    });

    await this.broadcastQueueEvent(completed, SOCKET_EVENTS.QUEUE_COMPLETED);
    this.gateway.broadcastToStore(completed.storeId, SOCKET_EVENTS.STATS_UPDATED, {
      storeId: completed.storeId,
      reason: 'queue:completed',
    });

    return completed;
  }

  async skip(ticketId: string): Promise<QueueRow> {
    const ticket = await this.requireQueue(ticketId);

    const skipped = await this.prisma.db.queue.update({
      where: { id: ticket.id },
      data: { status: QueueStatus.SKIPPED, completedAt: new Date() },
      include: { service: true, store: true },
    });

    await this.broadcastQueueEvent(skipped, SOCKET_EVENTS.QUEUE_SKIPPED);

    return skipped;
  }

  async cancel(ticketId: string): Promise<QueueRow> {
    const ticket = await this.requireQueue(ticketId);

    const cancelled = await this.prisma.db.queue.update({
      where: { id: ticket.id },
      data: { status: QueueStatus.CANCELLED, completedAt: new Date() },
      include: { service: true, store: true },
    });

    await this.broadcastQueueEvent(cancelled, SOCKET_EVENTS.QUEUE_UPDATED);

    return cancelled;
  }

  // ------------------------------------------------------------------
  // Statistik harian (PRD section B.3)
  // ------------------------------------------------------------------

  async dailyStats(storeSlug: string, serviceId?: string): Promise<DailyStatsDto> {
    const store = await this.stores.findBySlugOrFail(storeSlug);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const scope = {
      storeId: store.id,
      ...(serviceId ? { serviceId } : {}),
    };

    const [completedToday, processingNow, skippedToday, remainingActive, waitAgg, serviceAgg] =
      await Promise.all([
        this.prisma.db.queue.count({
          where: { ...scope, status: QueueStatus.COMPLETED, completedAt: { gte: startOfDay } },
        }),
        this.prisma.db.queue.count({
          where: { ...scope, status: QueueStatus.PROCESSING },
        }),
        this.prisma.db.queue.count({
          where: { ...scope, status: QueueStatus.SKIPPED, createdAt: { gte: startOfDay } },
        }),
        this.prisma.db.queue.count({
          where: { ...scope, status: { in: [...ACTIVE_QUEUE_STATUSES] } },
        }),
        this.aggregateMinutes(scope, startOfDay, endOfDay, 'wait'),
        this.aggregateMinutes(scope, startOfDay, endOfDay, 'service'),
      ]);

    return {
      storeId: store.id,
      date: startOfDay.toISOString().slice(0, 10),
      servedToday: completedToday + processingNow,
      skippedToday,
      remainingActive,
      averageWaitMinutes: waitAgg,
      averageServiceMinutes: serviceAgg,
    };
  }

  /**
   * Menghitung rata-rata durasi dalam menit. Data diambil ke aplikasi karena
   * selisih interval di PostgreSQL lebih repot daripada selisih DateTime di
   * sisi TypeScript untuk volume antrean sekelas UMKM.
   */
  private async aggregateMinutes(
    scope: Prisma.QueueWhereInput,
    start: Date,
    end: Date,
    kind: 'wait' | 'service',
  ): Promise<number | null> {
    const where: Prisma.QueueWhereInput =
      kind === 'wait'
        ? { ...scope, calledAt: { gte: start, lte: end }, createdAt: { gte: start } }
        : {
            ...scope,
            completedAt: { gte: start, lte: end },
            calledAt: { not: null },
          };

    const rows = await this.prisma.db.queue.findMany({
      where,
      select: { createdAt: true, calledAt: true, completedAt: true },
    });

    const durations = rows
      .map((row) => {
        if (kind === 'wait' && row.calledAt) {
          return (row.calledAt.getTime() - row.createdAt.getTime()) / 60_000;
        }

        if (kind === 'service' && row.calledAt && row.completedAt) {
          return (row.completedAt.getTime() - row.calledAt.getTime()) / 60_000;
        }

        return null;
      })
      .filter((value): value is number => value !== null && value >= 0);

    if (durations.length === 0) {
      return null;
    }

    const total = durations.reduce((sum, value) => sum + value, 0);

    return Math.round((total / durations.length) * 10) / 10;
  }

  private async requireQueue(ticketId: string): Promise<QueueRow> {
    const ticket = await this.prisma.db.queue.findUnique({
      where: { id: ticketId },
      include: { service: true, store: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Tiket "${ticketId}" tidak ditemukan`);
    }

    return ticket;
  }
}
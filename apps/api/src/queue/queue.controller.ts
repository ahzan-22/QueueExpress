import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { QueueService } from './queue.service';
import { CallNextDto, CreateTicketDto } from './dto/queue.dto';

/** Endpoint yang butuh storeSlug sebagai konteks (dipakai setelah scan QR). */
@Controller('stores/:storeSlug/queue')
export class QueueController {
  constructor(private readonly queue: QueueService) {}

  /** Ambil tiket baru (dipanggil setelah pelanggan scan QR). */
  @Post('tickets')
  createTicket(@Param('storeSlug') storeSlug: string, @Body() dto: CreateTicketDto) {
    return this.queue.createTicket(storeSlug, dto);
  }

  /** Antrean aktif, untuk polling fallback saat WebSocket terputus. */
  @Get()
  listActive(@Param('storeSlug') storeSlug: string, @Query('serviceId') serviceId?: string) {
    return this.queue.listActive(storeSlug, serviceId);
  }

  /** Data untuk TV Display Board (PRD section C). */
  @Get('display')
  getDisplayBoard(@Param('storeSlug') storeSlug: string, @Query('serviceId') serviceId?: string) {
    return this.queue.getDisplayBoard(storeSlug, serviceId);
  }

  /** Statistik harian untuk Operator Dashboard (PRD section B.3). */
  @Get('stats')
  dailyStats(@Param('storeSlug') storeSlug: string, @Query('serviceId') serviceId?: string) {
    return this.queue.dailyStats(storeSlug, serviceId);
  }

  @Post('call-next')
  callNext(@Param('storeSlug') storeSlug: string, @Body() dto: CallNextDto) {
    return this.queue.callNext(storeSlug, dto);
  }
}
import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { QueueService } from './queue.service';

/**
 * Endpoint tingkat tiket. Store tidak perlupassed karena context-nya
 * diambil dari baris tiket itu sendiri.
 */
@Controller('tickets')
export class TicketsController {
  constructor(private readonly queue: QueueService) {}

  /** Kartu status untuk layar /queue/[ticketId] (PRD section A.2). */
  @Get(':ticketId')
  getTicketView(@Param('ticketId') ticketId: string) {
    return this.queue.getTicketView(ticketId);
  }

  // One-Tap Queue Controls (PRD section B.1)
  @Post(':ticketId/call-again')
  callAgain(@Param('ticketId') ticketId: string) {
    return this.queue.callAgain(ticketId);
  }

  @Post(':ticketId/start')
  start(@Param('ticketId') ticketId: string) {
    return this.queue.start(ticketId);
  }

  @Post(':ticketId/complete')
  complete(@Param('ticketId') ticketId: string) {
    return this.queue.complete(ticketId);
  }

  @Post(':ticketId/skip')
  skip(@Param('ticketId') ticketId: string) {
    return this.queue.skip(ticketId);
  }

  @Post(':ticketId/cancel')
  cancel(@Param('ticketId') ticketId: string) {
    return this.queue.cancel(ticketId);
  }

  /**
   * Hapus permanen antrean yang tertahan (mis. duplikat / data uji / macet).
   * Berbeda dengan cancel/skip yang hanya mengubah status.
   */
  @Delete(':ticketId')
  remove(@Param('ticketId') ticketId: string) {
    return this.queue.removeTicket(ticketId);
  }
}
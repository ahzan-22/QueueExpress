import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { TicketsController } from './tickets.controller';
import { QueueService } from './queue.service';
import { StoresModule } from '../stores/stores.module';

@Module({
  imports: [StoresModule],
  controllers: [QueueController, TicketsController],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
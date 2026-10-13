import { Global, Module } from '@nestjs/common';
import { QueueGateway } from './queue.gateway';

@Global()
@Module({
  providers: [QueueGateway],
  exports: [QueueGateway],
})
export class RealtimeModule {}
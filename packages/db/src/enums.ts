import { QueueStatus } from './generated/prisma/enums';

/** Bridge enum Prisma -> enum shared, agar satu sumber kebenaran di sisi app. */
export const PrismaQueueStatus = QueueStatus;
export type PrismaQueueStatus = QueueStatus;
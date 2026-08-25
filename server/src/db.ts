import { PrismaClient } from '@prisma/client';

// Prevent multiple Prisma Client instances in development
declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

export const db: PrismaClient =
    global.__prisma ?? new PrismaClient({ log: ['error'] });

if (process.env.NODE_ENV !== 'production') {
    global.__prisma = db;
}

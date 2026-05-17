/**
 * Prisma client singleton.
 *
 * Next.js dev mode reloads modules on every request — without this guard we'd
 * exhaust the Postgres connection pool. The `globalThis` cache means the
 * same client survives HMR while staying isolated in production builds.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

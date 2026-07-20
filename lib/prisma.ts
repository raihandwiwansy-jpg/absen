import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

function createPrismaClient() {
  const dbPath = `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;
  // @ts-ignore - Prisma v7 adapter API
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  // @ts-ignore - Prisma v7 adapter API
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

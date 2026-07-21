import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs';

function createPrismaClient() {
  let dbFilePath = path.join(process.cwd(), 'prisma', 'dev.db');

  // Di lingkungan Vercel / Serverless, direktori project (/var/task) bersifat read-only.
  // /tmp adalah satu-satunya direktori yang writable di Vercel Serverless Functions.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production') {
    const tmpDbPath = path.join('/tmp', 'dev.db');
    if (!fs.existsSync(tmpDbPath)) {
      try {
        if (fs.existsSync(dbFilePath)) {
          fs.copyFileSync(dbFilePath, tmpDbPath);
        } else {
          fs.writeFileSync(tmpDbPath, '');
        }
      } catch (err) {
        console.error('Gagal menyalin dev.db ke /tmp:', err);
      }
    }
    dbFilePath = tmpDbPath;
  }

  const dbUrl = `file:${dbFilePath}`;
  // @ts-ignore - Prisma v7 adapter API
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  // @ts-ignore - Prisma v7 adapter API
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

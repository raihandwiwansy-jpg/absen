import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const dbPath = `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;
// @ts-ignore - Prisma v7 adapter takes {url}
const adapter = new PrismaBetterSqlite3({ url: dbPath });
// @ts-ignore - Prisma v7 adapter API
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await prisma.admin.findUnique({ where: { username } });

  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.admin.create({
      data: { username, passwordHash },
    });
    console.log('✅ Admin default berhasil dibuat:');
    console.log(`   Username : ${username}`);
    console.log(`   Password : ${password}`);
    console.log('   ⚠️  Ganti password di production!');
  } else {
    console.log('ℹ️  Admin sudah ada, skip seed.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

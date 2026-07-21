import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/embeddings - return all face descriptors for client-side matching
// Publik karena hanya berisi data numerik (bukan foto/PII sensitif)
export async function GET() {
  try {
    const anggota = await prisma.anggota.findMany({
      select: {
        id: true,
        nama: true,
        embeddings: true,
      },
      orderBy: { nama: 'asc' },
    });

    const result = anggota.map((a) => ({
      id: a.id,
      nama: a.nama,
      embeddings: JSON.parse(a.embeddings) as number[][],
    }));

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (error) {
    console.error('[GET /api/embeddings]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

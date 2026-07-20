import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        // Cache untuk 30 detik (embeddings tidak berubah sering)
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('[GET /api/embeddings]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

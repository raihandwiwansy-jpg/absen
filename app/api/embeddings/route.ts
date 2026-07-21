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

    const result = [];
    for (const a of anggota) {
      try {
        const parsed = typeof a.embeddings === 'string' ? JSON.parse(a.embeddings) : a.embeddings;
        if (Array.isArray(parsed)) {
          result.push({
            id: a.id,
            nama: a.nama,
            embeddings: parsed as number[][],
          });
        }
      } catch {
        // Abaikan anggota ini jika JSON embeddings rusak agar tidak melempar error 500
      }
    }

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

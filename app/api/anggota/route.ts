import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth';
import { cosineSimilarity, SIMILARITY_THRESHOLD, averageDescriptors } from '@/lib/face-matcher';

export const dynamic = 'force-dynamic';

// GET /api/anggota - ambil semua anggota (tanpa embedding untuk efisiensi)
export async function GET() {
  try {
    const anggota = await prisma.anggota.findMany({
      select: {
        id: true,
        nama: true,
        thumbnailBase64: true,
        createdAt: true,
        _count: { select: { absensi: true } },
      },
      orderBy: { nama: 'asc' },
    });

    return NextResponse.json(anggota, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (error) {
    console.error('[GET /api/anggota]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/anggota - tambah anggota baru (admin only)
export async function POST(request: NextRequest) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { nama, embeddings, thumbnailBase64 } = body;

    if (!nama || !embeddings || !Array.isArray(embeddings)) {
      return NextResponse.json(
        { error: 'nama dan embeddings wajib diisi' },
        { status: 400 }
      );
    }

    // CEK DUPLIKASI WAJAH (1 Wajah hanya boleh terdaftar 1 kali)
    const existingMembers = await prisma.anggota.findMany({
      select: { id: true, nama: true, embeddings: true },
    });

    const avgNew = averageDescriptors(embeddings);

    for (const member of existingMembers) {
      try {
        const storedDescriptors: number[][] = JSON.parse(member.embeddings);
        if (!Array.isArray(storedDescriptors) || storedDescriptors.length === 0) continue;

        const avgStored = averageDescriptors(storedDescriptors);
        const avgSim = cosineSimilarity(avgNew, avgStored);

        let maxPairwiseSim = 0;
        for (const newDesc of embeddings) {
          for (const storedDesc of storedDescriptors) {
            const sim = cosineSimilarity(newDesc, storedDesc);
            if (sim > maxPairwiseSim) maxPairwiseSim = sim;
          }
        }

        // Cek jika rata-rata similarity melampaui threshold ATAU ada pasangan identik >= 0.90
        if (avgSim >= SIMILARITY_THRESHOLD || maxPairwiseSim >= 0.90) {
          return NextResponse.json(
            {
              error: `Wajah ini sudah terdaftar atas nama "${member.nama}". Satu wajah hanya boleh didaftarkan 1 kali dalam sistem.`,
            },
            { status: 400 }
          );
        }
      } catch {
        // Abaikan jika data JSON rusak
      }
    }

    const anggota = await prisma.anggota.create({
      data: {
        nama,
        embeddings: JSON.stringify(embeddings),
        thumbnailBase64: thumbnailBase64 || null,
      },
      select: { id: true, nama: true, thumbnailBase64: true, createdAt: true },
    });

    return NextResponse.json(anggota, { status: 201 });
  } catch (error) {
    console.error('[POST /api/anggota]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

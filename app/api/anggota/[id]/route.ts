import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth';
import { cosineSimilarity, SIMILARITY_THRESHOLD, averageDescriptors } from '@/lib/face-matcher';

export const dynamic = 'force-dynamic';

// PUT /api/anggota/[id] - update nama atau embedding anggota
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const anggotaId = parseInt(id);
    if (isNaN(anggotaId)) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { nama, embeddings, thumbnailBase64 } = body;

    // CEK DUPLIKASI JIKA ADA UPDATE EMBEDDINGS
    if (embeddings && Array.isArray(embeddings)) {
      const existingMembers = await prisma.anggota.findMany({
        where: { id: { not: anggotaId } },
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

          if (avgSim >= SIMILARITY_THRESHOLD || maxPairwiseSim >= 0.90) {
            return NextResponse.json(
              {
                error: `Wajah ini sudah terdaftar atas nama "${member.nama}". Satu wajah hanya boleh didaftarkan 1 kali dalam sistem.`,
              },
              { status: 400 }
            );
          }
        } catch {
          // ignore
        }
      }
    }

    const data: Record<string, unknown> = {};
    if (nama) data.nama = nama;
    if (embeddings) data.embeddings = JSON.stringify(embeddings);
    if (thumbnailBase64 !== undefined) data.thumbnailBase64 = thumbnailBase64;

    const updated = await prisma.anggota.update({
      where: { id: anggotaId },
      data,
      select: { id: true, nama: true, thumbnailBase64: true, updatedAt: true },
    });

    return NextResponse.json(updated, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (error) {
    console.error('[PUT /api/anggota/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/anggota/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const anggotaId = parseInt(id);
    if (isNaN(anggotaId)) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }

    // Hapus data absensi terkait terlebih dahulu agar pasti bersih (mencegah error FK SQLite)
    await prisma.absensi.deleteMany({ where: { anggotaId } });
    await prisma.anggota.delete({ where: { id: anggotaId } });

    return NextResponse.json({ success: true }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (error) {
    console.error('[DELETE /api/anggota/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

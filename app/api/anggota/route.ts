import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth';
import { cosineSimilarity, SIMILARITY_THRESHOLD } from '@/lib/face-matcher';

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

    return NextResponse.json(anggota);
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
    const body = await request.json();
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

    for (const member of existingMembers) {
      try {
        const storedDescriptors: number[][] = JSON.parse(member.embeddings);
        for (const newDesc of embeddings) {
          for (const storedDesc of storedDescriptors) {
            const sim = cosineSimilarity(newDesc, storedDesc);
            if (sim >= SIMILARITY_THRESHOLD) {
              return NextResponse.json(
                {
                  error: `Wajah ini sudah terdaftar atas nama "${member.nama}". Satu wajah hanya boleh didaftarkan 1 kali dalam sistem.`,
                },
                { status: 400 }
              );
            }
          }
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

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth';

// GET /api/absensi - list absensi dengan filter opsional
export async function GET(request: NextRequest) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const anggotaId = searchParams.get('anggotaId');
    const tanggal = searchParams.get('tanggal');      // format: YYYY-MM-DD
    const bulan = searchParams.get('bulan');           // format: MM
    const tahun = searchParams.get('tahun');           // format: YYYY

    const where: Record<string, unknown> = {};

    if (anggotaId) {
      where.anggotaId = parseInt(anggotaId);
    }

    if (tanggal) {
      const start = new Date(tanggal);
      const end = new Date(tanggal);
      end.setDate(end.getDate() + 1);
      where.tanggal = { gte: start, lt: end };
    } else if (bulan && tahun) {
      const monthInt = parseInt(bulan);
      const yearInt = parseInt(tahun);
      const start = new Date(yearInt, monthInt - 1, 1);
      const end = new Date(yearInt, monthInt, 1);
      where.tanggal = { gte: start, lt: end };
    } else if (tahun) {
      const yearInt = parseInt(tahun);
      const start = new Date(yearInt, 0, 1);
      const end = new Date(yearInt + 1, 0, 1);
      where.tanggal = { gte: start, lt: end };
    }

    const absensi = await prisma.absensi.findMany({
      where,
      include: {
        anggota: { select: { id: true, nama: true } },
      },
      orderBy: { tanggal: 'desc' },
    });

    return NextResponse.json(absensi);
  } catch (error) {
    console.error('[GET /api/absensi]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/absensi - catat kehadiran (dari halaman absen publik)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anggotaId } = body;

    if (!anggotaId) {
      return NextResponse.json({ error: 'anggotaId wajib diisi' }, { status: 400 });
    }

    // Cek anggota ada
    const anggota = await prisma.anggota.findUnique({
      where: { id: anggotaId },
      select: { id: true, nama: true },
    });

    if (!anggota) {
      return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 });
    }

    // Cek sudah absen hari ini
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const existingAbsensi = await prisma.absensi.findFirst({
      where: {
        anggotaId,
        tanggal: { gte: startOfDay, lt: endOfDay },
      },
    });

    if (existingAbsensi) {
      // Sudah absen hari ini - tetap sukses (idempotent)
      return NextResponse.json({
        success: true,
        alreadyRecorded: true,
        anggota,
      });
    }

    const absensi = await prisma.absensi.create({
      data: { anggotaId, tanggal: new Date() },
      include: { anggota: { select: { id: true, nama: true } } },
    });

    return NextResponse.json({ success: true, absensi }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/absensi]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

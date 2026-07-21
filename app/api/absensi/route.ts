import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth';
import { getDailyCode } from '@/lib/daily-code';
import { getJakartaDayBounds, getTodayJakartaBounds } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

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
      const idNum = parseInt(anggotaId);
      if (!isNaN(idNum)) where.anggotaId = idNum;
    }

    if (tanggal) {
      const [y, m, d] = tanggal.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const { start, end } = getJakartaDayBounds(y, m, d);
        where.tanggal = { gte: start, lt: end };
      }
    } else if (bulan && tahun) {
      const monthInt = parseInt(bulan);
      const yearInt = parseInt(tahun);
      if (!isNaN(monthInt) && !isNaN(yearInt)) {
        const start = new Date(Date.UTC(yearInt, monthInt - 1, 1, -7, 0, 0));
        const end = new Date(Date.UTC(yearInt, monthInt, 1, -7, 0, 0));
        where.tanggal = { gte: start, lt: end };
      }
    } else if (tahun) {
      const yearInt = parseInt(tahun);
      if (!isNaN(yearInt)) {
        const start = new Date(Date.UTC(yearInt, 0, 1, -7, 0, 0));
        const end = new Date(Date.UTC(yearInt + 1, 0, 1, -7, 0, 0));
        where.tanggal = { gte: start, lt: end };
      }
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
    const body = await request.json().catch(() => ({}));
    const { anggotaId, kodeHarian } = body;

    if (!anggotaId) {
      return NextResponse.json({ error: 'anggotaId wajib diisi' }, { status: 400 });
    }

    const idNum = typeof anggotaId === 'number' ? anggotaId : parseInt(anggotaId);
    if (isNaN(idNum) || idNum <= 0) {
      return NextResponse.json({ error: 'ID anggota tidak valid' }, { status: 400 });
    }

    const validCode = getDailyCode();

    if (kodeHarian !== validCode) {
      return NextResponse.json({ error: 'Kode absen tidak valid atau sudah kadaluarsa.' }, { status: 403 });
    }

    // Cek anggota ada
    const anggota = await prisma.anggota.findUnique({
      where: { id: idNum },
      select: { id: true, nama: true },
    });

    if (!anggota) {
      return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 });
    }

    // Cek sudah absen hari ini
    const { start: startOfDay, end: endOfDay } = getTodayJakartaBounds();

    const existingAbsensi = await prisma.absensi.findFirst({
      where: {
        anggotaId: idNum,
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
      data: { anggotaId: idNum, tanggal: new Date() },
      include: { anggota: { select: { id: true, nama: true } } },
    });

    return NextResponse.json({ success: true, absensi }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/absensi]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

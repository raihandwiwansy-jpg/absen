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
      const [y, m, d] = tanggal.split('-').map(Number);
      const start = new Date(Date.UTC(y, m - 1, d, -7, 0, 0));
      const end = new Date(Date.UTC(y, m - 1, d + 1, -7, 0, 0));
      where.tanggal = { gte: start, lt: end };
    } else if (bulan && tahun) {
      const monthInt = parseInt(bulan);
      const yearInt = parseInt(tahun);
      const start = new Date(Date.UTC(yearInt, monthInt - 1, 1, -7, 0, 0));
      const end = new Date(Date.UTC(yearInt, monthInt, 1, -7, 0, 0));
      where.tanggal = { gte: start, lt: end };
    } else if (tahun) {
      const yearInt = parseInt(tahun);
      const start = new Date(Date.UTC(yearInt, 0, 1, -7, 0, 0));
      const end = new Date(Date.UTC(yearInt + 1, 0, 1, -7, 0, 0));
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
    const { anggotaId, kodeHarian } = body;

    if (!anggotaId) {
      return NextResponse.json({ error: 'anggotaId wajib diisi' }, { status: 400 });
    }

    const { getDailyCode } = await import('@/lib/daily-code');
    const validCode = getDailyCode();

    if (kodeHarian !== validCode) {
      return NextResponse.json({ error: 'Kode absen tidak valid atau sudah kadaluarsa.' }, { status: 403 });
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
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const dateStr = formatter.format(now); // e.g. "7/21/2026"
    const [m, d, y] = dateStr.split('/').map(Number);
    
    // 00:00 WIB = 17:00 UTC previous day
    const startOfDay = new Date(Date.UTC(y, m - 1, d, -7, 0, 0));
    const endOfDay = new Date(Date.UTC(y, m - 1, d + 1, -7, 0, 0));

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

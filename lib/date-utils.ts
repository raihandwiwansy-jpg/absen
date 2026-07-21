/**
 * Utility functions untuk penanganan tanggal dan zona waktu Asia/Jakarta (WIB / UTC+7).
 */

export interface JakartaDateParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

/**
 * Mengambil bagian tahun, bulan (1-12), dan tanggal (1-31) dalam zona waktu Asia/Jakarta (WIB)
 * dari objek Date, secara robust tanpa bergantung pada format pemisah string lokal OS (/ atau - atau .).
 */
export function getJakartaDateParts(d: Date = new Date()): JakartaDateParts {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(d);

    const year = Number(parts.find((p) => p.type === 'year')?.value);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);

    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  } catch {
    // ignore
  }

  // Fallback manual jika Intl formatToParts gagal (UTC+7 jam)
  const wibTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return {
    year: wibTime.getUTCFullYear(),
    month: wibTime.getUTCMonth() + 1,
    day: wibTime.getUTCDate(),
  };
}

/**
 * Mendapatkan rentang waktu (start & end of day dalam UTC Date) untuk hari tertentu di zona waktu Asia/Jakarta (UTC+7).
 * 00:00:00 WIB = 17:00:00 UTC hari sebelumnya.
 * 24:00:00 WIB = 17:00:00 UTC hari yang bersangkutan.
 */
export function getJakartaDayBounds(year: number, month: number, day: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day + 1, -7, 0, 0, 0));
  return { start, end };
}

/**
 * Mendapatkan rentang waktu hari ini (WIB) dalam UTC Date.
 */
export function getTodayJakartaBounds(): { start: Date; end: Date } {
  const { year, month, day } = getJakartaDateParts(new Date());
  return getJakartaDayBounds(year, month, day);
}

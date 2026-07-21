import crypto from 'crypto';
import { getJakartaDateParts } from './date-utils';

export function getDailyCode(): string {
  const secret = process.env.SESSION_SECRET || 'marching-band-secret';
  const now = new Date();
  
  // Ambil tanggal dalam zona waktu WIB (Asia/Jakarta)
  const { year, month, day } = getJakartaDateParts(now);
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const dateStr = `${year}-${monthStr}-${dayStr}`;
  
  // Buat hash dari tanggal dan secret
  let hash = 0;
  const str = dateStr + secret;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; 
  }
  
  // Ambil 5 digit positif
  return String(Math.abs(hash)).substring(0, 5).padStart(5, '0');
}

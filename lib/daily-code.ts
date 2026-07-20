import crypto from 'crypto';

export function getDailyCode(): string {
  const secret = process.env.SESSION_SECRET || 'marching-band-secret';
  const now = new Date();
  
  // Tanggal format: YYYY-MM-DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
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

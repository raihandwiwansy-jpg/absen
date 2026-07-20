import crypto from 'crypto';

export function getDailyCode(): string {
  const secret = process.env.SESSION_SECRET || 'marching-band-secret';
  const now = new Date();
  
  // Ambil tanggal dalam zona waktu WIB (Asia/Jakarta)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // output format: MM/DD/YYYY
  const dateParts = formatter.format(now).split('/');
  const dateStr = `${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`;
  
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

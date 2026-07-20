import { cookies } from 'next/headers';
import { prisma } from './prisma';

const SESSION_COOKIE = 'mb_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'marching-band-secret';

// Simple token: base64(username:timestamp:secret_hash)
export function createSessionToken(username: string): string {
  const timestamp = Date.now().toString();
  const payload = `${username}:${timestamp}`;
  return Buffer.from(payload).toString('base64');
}

export function parseSessionToken(token: string): { username: string; timestamp: number } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [username, timestamp] = decoded.split(':');
    if (!username || !timestamp) return null;
    return { username, timestamp: parseInt(timestamp) };
  } catch {
    return null;
  }
}

export async function getSessionAdmin(): Promise<{ id: number; username: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const parsed = parseSessionToken(token);
    if (!parsed) return null;

    // Session expires after 24 hours
    const AGE_MS = 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > AGE_MS) return null;

    const admin = await prisma.admin.findUnique({
      where: { username: parsed.username },
      select: { id: true, username: true },
    });

    return admin;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

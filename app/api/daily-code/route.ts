import { NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import { getDailyCode } from '@/lib/daily-code';

export async function GET() {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const code = getDailyCode();
  return NextResponse.json({ code });
}

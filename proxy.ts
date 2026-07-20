import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, parseSessionToken } from '@/lib/auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const parsed = parseSessionToken(token);
    if (!parsed) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check session expiry (24 hours)
    const AGE_MS = 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > AGE_MS) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};

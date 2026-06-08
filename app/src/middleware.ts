import { NextRequest, NextResponse } from 'next/server';

/**
 * Bots and monitors sometimes send malformed Range headers (e.g. missing "bytes=").
 * Vercel's edge returns 416 RANGE_MISSING_UNIT and may cache it. Strip bad Range early.
 */
export function middleware(request: NextRequest) {
  const range = request.headers.get('range');
  if (!range) {
    return NextResponse.next();
  }

  const normalized = range.trim().toLowerCase();
  if (!normalized.startsWith('bytes=')) {
    const headers = new Headers(request.headers);
    headers.delete('range');
    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};

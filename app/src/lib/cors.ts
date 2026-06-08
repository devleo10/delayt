import { NextRequest, NextResponse } from 'next/server';

const RATE_LIMIT_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS || '30', 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000', 10);

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/** Origins allowed to call mutating API routes from a browser. */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;

  const allowedPatterns = [
    /^https?:\/\/localhost(?::\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(?::\d+)?$/,
  ];

  if (allowedPatterns.some((p) => p.test(origin))) return true;

  if (process.env.VERCEL_URL) {
    const vercelOrigin = `https://${process.env.VERCEL_URL}`;
    if (origin === vercelOrigin) return true;
  }

  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return true;

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()) || [];
  if (allowedOrigins.includes(origin)) return true;

  return false;
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export function checkRateLimit(ip: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_REQUESTS) {
    const resetMinutes = Math.ceil((entry.resetAt - now) / 60000);
    return {
      allowed: false,
      message: `Rate limit exceeded. Try again in ${resetMinutes} minute(s).`,
    };
  }

  entry.count++;
  return { allowed: true };
}

/** CORS headers for an allowed browser origin (credentials-safe). */
export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Delayt-Import-Key, X-Requested-With',
  };
}

/** Preflight handler for browser cross-origin POSTs. */
export function corsPreflightResponse(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');

  if (!origin) {
    return new NextResponse(null, { status: 204 });
  }

  if (!isOriginAllowed(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

/** Reject disallowed browser origins on mutating routes. */
export function rejectDisallowedOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  if (origin && !isOriginAllowed(origin)) {
    return NextResponse.json({ error: 'CORS policy: Origin not allowed' }, { status: 403 });
  }
  return null;
}

/**
 * Optional shared secret for CLI `--share` uploads (`/api/runs/import`).
 * When set, callers must send `X-Delayt-Import-Key` or `Authorization: Bearer <key>`.
 */
export function checkImportApiKey(request: NextRequest): NextResponse | null {
  const expected = process.env.IMPORT_API_KEY?.trim();
  if (!expected) return null;

  const headerKey = request.headers.get('x-delayt-import-key')?.trim();
  const auth = request.headers.get('authorization')?.trim();
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : undefined;

  if (headerKey === expected || bearer === expected) {
    return null;
  }

  return NextResponse.json(
    { success: false, message: 'Invalid or missing import API key' },
    { status: 401 }
  );
}

// Prune stale rate-limit entries (serverless-safe best effort).
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((entry, key) => {
      if (now > entry.resetAt) {
        rateLimitMap.delete(key);
      }
    });
  }, 10 * 60 * 1000);
}

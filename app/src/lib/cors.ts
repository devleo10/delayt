import { NextRequest, NextResponse } from 'next/server';

const RATE_LIMIT_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS || '30', 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000', 10);

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/** www ↔ apex pair for a configured production URL. */
export function expandOriginVariants(originUrl: string): string[] {
  try {
    const parsed = new URL(originUrl);
    const variants = new Set<string>([parsed.origin]);
    const { protocol, hostname, port } = parsed;

    if (hostname.startsWith('www.')) {
      const apexHost = hostname.slice(4);
      variants.add(`${protocol}//${apexHost}${port ? `:${port}` : ''}`);
    } else if (!hostname.includes('localhost') && hostname.includes('.')) {
      variants.add(`${protocol}//www.${hostname}${port ? `:${port}` : ''}`);
    }

    return [...variants];
  } catch {
    return [originUrl];
  }
}

function configuredOrigins(): string[] {
  const origins = new Set<string>();

  if (process.env.FRONTEND_URL) {
    for (const origin of expandOriginVariants(process.env.FRONTEND_URL.trim())) {
      origins.add(origin);
    }
  }

  for (const entry of process.env.ALLOWED_ORIGINS?.split(',') || []) {
    const trimmed = entry.trim();
    if (trimmed) origins.add(trimmed);
  }

  return [...origins];
}

/** Origins implied by the Host this request hit (custom domain on Vercel, no env required). */
export function originsForRequestHost(request: NextRequest): string[] {
  const hostHeader =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    request.headers.get('host')?.trim();

  if (!hostHeader) return [];

  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
  const base = `${proto}://${hostHeader}`;
  const variants = new Set<string>(expandOriginVariants(base));

  // Local dev may use http while forwarded-proto is https behind a proxy.
  if (proto === 'https') {
    for (const origin of [...variants]) {
      variants.add(origin.replace(/^https:\/\//, 'http://'));
    }
  }

  return [...variants];
}

/** Origins allowed to call mutating API routes from a browser. */
export function isOriginAllowed(origin: string | null, request?: NextRequest): boolean {
  if (!origin) return true;

  const allowedPatterns = [
    /^https?:\/\/localhost(?::\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(?::\d+)?$/,
  ];

  if (allowedPatterns.some((p) => p.test(origin))) return true;

  if (request && originsForRequestHost(request).includes(origin)) return true;

  if (process.env.VERCEL_URL) {
    const vercelOrigin = `https://${process.env.VERCEL_URL}`;
    if (origin === vercelOrigin) return true;
  }

  if (configuredOrigins().includes(origin)) return true;

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

  if (!isOriginAllowed(origin, request)) {
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
  if (origin && !isOriginAllowed(origin, request)) {
    return NextResponse.json(
      {
        error: 'CORS policy: Origin not allowed',
        origin,
        host: request.headers.get('host'),
        hint: 'Origin must match the site host, FRONTEND_URL, or ALLOWED_ORIGINS.',
      },
      { status: 403 }
    );
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

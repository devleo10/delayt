import { NextRequest, NextResponse } from 'next/server';
import { EndpointConfig, validateRunRequest } from '@delayt/shared';
import { createAndStartRun } from '@/lib/runner';
import {
  CLI_RECOMMENDED_REQUEST_COUNT,
  clampWebRequestCount,
  getServerWebDefaultRequestCount,
  getServerWebMaxRequestCount,
} from '@/lib/limits';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RATE_LIMIT_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS || '30', 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000', 10);

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isOriginAllowed(origin: string | null): boolean {
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

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         '127.0.0.1';
}

function checkRateLimit(ip: string): { allowed: boolean; message?: string } {
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

setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((entry, key) => {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  });
}, 10 * 60 * 1000);

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && !isOriginAllowed(origin)) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  if (!isOriginAllowed(request.headers.get('origin'))) {
    return NextResponse.json(
      { error: 'CORS policy: Origin not allowed' },
      { status: 403 }
    );
  }

  const ip = getClientIp(request);
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { success: false, message: rateCheck.message },
      { status: 429 }
    );
  }

  let body: { endpoints?: EndpointConfig[]; requestCount?: number };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { endpoints, requestCount = getServerWebDefaultRequestCount() } = body;

  const webMax = getServerWebMaxRequestCount();
  if (requestCount > webMax) {
    return NextResponse.json(
      {
        success: false,
        message: `Web runs are limited to ${webMax} requests per endpoint. Use the CLI for ${CLI_RECOMMENDED_REQUEST_COUNT}+: npx @delayt/cli run -u <url> -n ${CLI_RECOMMENDED_REQUEST_COUNT}`,
        webMaxRequestCount: webMax,
        cliRecommendedRequestCount: CLI_RECOMMENDED_REQUEST_COUNT,
      },
      { status: 400 }
    );
  }

  const validation = validateRunRequest(
    { endpoints, requestCount },
    {
      maxRequestCount: webMax,
      defaultRequestCount: getServerWebDefaultRequestCount(),
    }
  );

  if (!validation.valid) {
    return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
  }

  const count = clampWebRequestCount(requestCount);

  try {
    const { runId, slug } = await createAndStartRun(endpoints!, count);

    return NextResponse.json({
      success: true,
      runId,
      slug,
      shareUrl: `/r/${slug}`,
      message: `Started test run for ${endpoints!.length} endpoint(s) with ${count} requests each`,
    });
  } catch (error) {
    console.error('Error starting test run:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to start test run' },
      { status: 500 }
    );
  }
}
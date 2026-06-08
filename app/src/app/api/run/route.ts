import { NextRequest, NextResponse } from 'next/server';
import { EndpointConfig, validateRunRequest } from '@delayt/shared';
import { createAndStartRun } from '@/lib/runner';
import {
  checkRateLimit,
  corsPreflightResponse,
  getClientIp,
  rejectDisallowedOrigin,
} from '@/lib/cors';
import {
  CLI_RECOMMENDED_REQUEST_COUNT,
  clampWebRequestCount,
  getServerWebDefaultRequestCount,
  getServerWebMaxRequestCount,
} from '@/lib/limits';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request);
}

export async function POST(request: NextRequest) {
  const corsReject = rejectDisallowedOrigin(request);
  if (corsReject) return corsReject;

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

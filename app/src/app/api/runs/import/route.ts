import { NextRequest, NextResponse } from 'next/server';
import { EndpointConfig, generateSlug, validateRunRequest } from '@delayt/shared';
import { importCompletedRun } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

interface ImportRequestRow {
  endpoint: string;
  method: string;
  latency_ms: number;
  request_size_bytes?: number;
  response_size_bytes?: number;
  status_code: number;
  error_message?: string;
}

export async function POST(request: NextRequest) {
  let body: {
    endpoints?: EndpointConfig[];
    requestCount?: number;
    requests?: ImportRequestRow[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validateRunRequest(body, {
    maxRequestCount: 200,
    defaultRequestCount: 50,
  });

  if (!validation.valid) {
    return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
  }

  const { endpoints, requests } = body;
  const requestCount = validation.count!;

  if (!requests || !Array.isArray(requests) || requests.length === 0) {
    return NextResponse.json(
      { success: false, message: 'At least one request sample is required' },
      { status: 400 }
    );
  }

  if (requests.length > requestCount * (endpoints?.length ?? 1)) {
    return NextResponse.json(
      { success: false, message: 'Too many request samples for this run' },
      { status: 400 }
    );
  }

  const normalized = requests.map((row) => ({
    endpoint: row.endpoint,
    method: row.method,
    latency_ms: row.latency_ms,
    request_size_bytes: row.request_size_bytes ?? 0,
    response_size_bytes: row.response_size_bytes ?? 0,
    status_code: row.status_code,
    error_message: row.error_message,
  }));

  const runId = `import_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const slug = generateSlug(8);

  try {
    await importCompletedRun(runId, slug, endpoints!, requestCount, normalized);

    return NextResponse.json({
      success: true,
      runId,
      slug,
      shareUrl: `/r/${slug}`,
      message: 'Run imported successfully',
    });
  } catch (error) {
    console.error('Error importing run:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to import run' },
      { status: 500 }
    );
  }
}

import { getPool } from '@/lib/db/client';
import {
  AnalyticsResult,
  RawRequestData,
  buildAnalyticsResult,
  RequestSample,
} from '@delayt/shared';

export async function getEndpointAnalytics(
  runId?: string
): Promise<AnalyticsResult[]> {
  const pool = getPool();

  let query = `
    SELECT endpoint, method, latency_ms, request_size_bytes, response_size_bytes, status_code, error_message
    FROM api_requests
  `;
  const params: string[] = [];

  if (runId) {
    query += ` WHERE run_id = $1`;
    params.push(runId);
  }

  query += ` ORDER BY endpoint, method, created_at`;

  const result = await pool.query<RawRequestData>(query, params);

  const grouped = new Map<
    string,
    {
      endpoint: string;
      method: string;
      latencies: number[];
      payloadSizes: number[];
      statusCodes: number[];
      errorCount: number;
    }
  >();

  for (const row of result.rows) {
    const key = `${row.endpoint}::${row.method}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        endpoint: row.endpoint,
        method: row.method,
        latencies: [],
        payloadSizes: [],
        statusCodes: [],
        errorCount: 0,
      });
    }

    const group = grouped.get(key)!;
    group.latencies.push(Number(row.latency_ms));
    group.payloadSizes.push(row.request_size_bytes);
    group.statusCodes.push(row.status_code);

    if (row.status_code === 0 || row.status_code >= 400) {
      group.errorCount++;
    }
  }

  const analytics: AnalyticsResult[] = [];

  for (const group of grouped.values()) {
    const samples: RequestSample[] = group.latencies.map((latencyMs, i) => ({
      latencyMs,
      statusCode: group.statusCodes[i],
      requestSizeBytes: group.payloadSizes[i],
    }));

    analytics.push(buildAnalyticsResult(group.endpoint, group.method, samples));
  }

  analytics.sort((a, b) => b.p95 - a.p95);

  return analytics;
}

export async function getRawRequestData(options?: {
  endpoint?: string;
  runId?: string;
  limit?: number;
}): Promise<RawRequestData[]> {
  const pool = getPool();
  const { endpoint, runId, limit = 5000 } = options || {};

  const safeLimit = Math.min(Math.max(limit, 10), 10000);

  let query = `
    SELECT id, run_id, endpoint, method, latency_ms, request_size_bytes,
           response_size_bytes, status_code, error_message, created_at
    FROM api_requests
  `;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (runId) {
    if (!runId || typeof runId !== 'string' || runId.trim().length === 0) {
      throw new Error('Invalid runId provided');
    }
    params.push(runId);
    conditions.push(`run_id = $${params.length}`);
  }

  if (endpoint) {
    if (
      !endpoint ||
      typeof endpoint !== 'string' ||
      endpoint.trim().length === 0
    ) {
      throw new Error('Invalid endpoint provided');
    }
    params.push(endpoint);
    conditions.push(`endpoint = $${params.length}`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(safeLimit);

  const result = await pool.query<RawRequestData>(query, params);
  return result.rows;
}

export async function getLatencyHistogram(
  runId?: string
): Promise<{ bucket: string; count: number }[]> {
  const pool = getPool();

  const whereClause = runId ? 'WHERE run_id = $1' : '';
  const query = `
    SELECT bucket, COUNT(*)::int as count
    FROM (
      SELECT
        CASE
          WHEN latency_ms < 50 THEN '0-50ms'
          WHEN latency_ms < 100 THEN '50-100ms'
          WHEN latency_ms < 200 THEN '100-200ms'
          WHEN latency_ms < 500 THEN '200-500ms'
          WHEN latency_ms < 1000 THEN '500ms-1s'
          ELSE '1s+'
        END AS bucket,
        CASE
          WHEN latency_ms < 50 THEN 1
          WHEN latency_ms < 100 THEN 2
          WHEN latency_ms < 200 THEN 3
          WHEN latency_ms < 500 THEN 4
          WHEN latency_ms < 1000 THEN 5
          ELSE 6
        END AS sort_order
      FROM api_requests
      ${whereClause}
    ) buckets
    GROUP BY bucket, sort_order
    ORDER BY sort_order
  `;

  const params: string[] = [];
  if (runId) {
    params.push(runId);
  }

  const result = await pool.query(query, params);
  return result.rows.map((row) => ({
    bucket: row.bucket,
    count: Number(row.count),
  }));
}
import { getPool } from './db/client';
import { AnalyticsResult, RawRequestData } from '@delayt/shared';

/**
 * Computes percentiles from a sorted array of numbers
 * Uses linear interpolation for non-integer indices
 */
export function computePercentiles(
  data: number[],
  percentiles: number[]
): Record<number, number> {
  if (data.length === 0) {
    return percentiles.reduce((acc, p) => ({ ...acc, [p]: 0 }), {});
  }

  const sorted = [...data].sort((a, b) => a - b);
  const result: Record<number, number> = {};

  for (const percentile of percentiles) {
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const fraction = index - lower;

    if (lower === upper) {
      result[percentile] = sorted[lower];
    } else {
      // Linear interpolation
      result[percentile] = sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
    }
  }

  return result;
}

/**
 * Computes standard deviation
 */
export function computeStdDev(data: number[], avg: number): number {
  if (data.length < 2) return 0;
  const squareDiffs = data.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / data.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Gets analytics results for all endpoints OR for a specific run
 * Groups by endpoint and method, computes percentiles, ranks by p95
 */
export async function getEndpointAnalytics(runId?: string): Promise<AnalyticsResult[]> {
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

  // Group by endpoint and method
  const grouped = new Map<string, {
    endpoint: string;
    method: string;
    latencies: number[];
    payloadSizes: number[];
    statusCodes: number[];
    errorCount: number;
  }>();

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
    
    // Count errors (status 0 = network error, 4xx/5xx = HTTP errors)
    if (row.status_code === 0 || row.status_code >= 400) {
      group.errorCount++;
    }
  }

  // Compute analytics for each group
  const analytics: AnalyticsResult[] = [];

  for (const group of grouped.values()) {
    const percentiles = computePercentiles(group.latencies, [50, 95, 99]);
    
    // Calculate average and other stats
    const avg = group.latencies.length > 0
      ? group.latencies.reduce((a, b) => a + b, 0) / group.latencies.length
      : 0;
    
    const min = group.latencies.length > 0 ? Math.min(...group.latencies) : 0;
    const max = group.latencies.length > 0 ? Math.max(...group.latencies) : 0;
    const stdDev = computeStdDev(group.latencies, avg);
    
    // Calculate average payload size
    const avgPayloadSize = group.payloadSizes.length > 0
      ? group.payloadSizes.reduce((a, b) => a + b, 0) / group.payloadSizes.length
      : 0;
    
    const errorRate = group.latencies.length > 0
      ? (group.errorCount / group.latencies.length) * 100
      : 0;

    analytics.push({
      endpoint: group.endpoint,
      method: group.method,
      p50: percentiles[50],
      p95: percentiles[95],
      p99: percentiles[99],
      min,
      max,
      avg,
      stdDev,
      avg_payload_size: Math.round(avgPayloadSize),
      request_count: group.latencies.length,
      error_count: group.errorCount,
      error_rate: Math.round(errorRate * 100) / 100,
      success_rate: Math.round((100 - errorRate) * 100) / 100,
    });
  }

  // Sort by p95 descending
  analytics.sort((a, b) => b.p95 - a.p95);

  return analytics;
}

/**
 * Gets raw request data, optionally filtered by endpoint or runId
 * Always paginates for safety to prevent memory overflow
 */
export async function getRawRequestData(options?: { 
  endpoint?: string; 
  runId?: string; 
  limit?: number;
}): Promise<RawRequestData[]> {
  const pool = getPool();
  const { endpoint, runId, limit = 5000 } = options || {};
  
  // Validate limit to prevent memory issues
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
    if (!endpoint || typeof endpoint !== 'string' || endpoint.trim().length === 0) {
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

/**
 * Get latency histogram data for visualization
 */
export async function getLatencyHistogram(runId?: string): Promise<{ bucket: string; count: number }[]> {
  const pool = getPool();
  
  // Bucket assignment is done in a subquery so the outer query can GROUP/ORDER
  // by real columns (`bucket`, `sort_order`) instead of a SELECT alias, which
  // Postgres does not allow inside expressions like `ORDER BY CASE bucket ...`.
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
  return result.rows.map((row) => ({ bucket: row.bucket, count: Number(row.count) }));
}



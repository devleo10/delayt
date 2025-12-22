import { getPool } from './db/client';
import { AnalyticsResult, BucketResult, RawRequestData } from './types';

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
 * Gets analytics results for all endpoints
 * Groups by endpoint and method, computes percentiles, ranks by p95
 */
export async function getEndpointAnalytics(): Promise<AnalyticsResult[]> {
  const pool = getPool();
  const result = await pool.query<RawRequestData>(
    `SELECT endpoint, method, latency_ms, request_size_bytes, response_size_bytes, status_code
     FROM api_requests
     ORDER BY endpoint, method, created_at`
  );

  // Group by endpoint and method
  const grouped = new Map<string, {
    endpoint: string;
    method: string;
    latencies: number[];
    payloadSizes: number[];
  }>();

  for (const row of result.rows) {
    const key = `${row.endpoint}::${row.method}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, {
        endpoint: row.endpoint,
        method: row.method,
        latencies: [],
        payloadSizes: [],
      });
    }

    const group = grouped.get(key)!;
    group.latencies.push(Number(row.latency_ms));
    group.payloadSizes.push(row.request_size_bytes);
  }

  // Compute analytics for each group
  const analytics: AnalyticsResult[] = [];

  for (const group of grouped.values()) {
    const percentiles = computePercentiles(group.latencies, [50, 95, 99]);
    
    // Calculate average payload size
    const avgPayloadSize = group.payloadSizes.length > 0
      ? group.payloadSizes.reduce((a, b) => a + b, 0) / group.payloadSizes.length
      : 0;

    analytics.push({
      endpoint: group.endpoint,
      method: group.method,
      p50: percentiles[50],
      p95: percentiles[95],
      p99: percentiles[99],
      avg_payload_size: Math.round(avgPayloadSize),
      request_count: group.latencies.length,
    });
  }

  // Sort by p95 descending
  analytics.sort((a, b) => b.p95 - a.p95);

  return analytics;
}

/**
 * Gets payload size buckets and computes p95 latency per bucket for a specific endpoint
 * Buckets: 0-100, 100-500, 500-1000, 1000-5000, 5000+ bytes
 */
export async function getPayloadSizeBuckets(endpoint: string): Promise<BucketResult[]> {
  const pool = getPool();
  const result = await pool.query<RawRequestData>(
    `SELECT latency_ms, request_size_bytes
     FROM api_requests
     WHERE endpoint = $1 AND method = 'POST'
     ORDER BY request_size_bytes`,
    [endpoint]
  );

  // Define buckets
  const buckets = [
    { name: '0-100', min: 0, max: 100 },
    { name: '100-500', min: 100, max: 500 },
    { name: '500-1000', min: 500, max: 1000 },
    { name: '1000-5000', min: 1000, max: 5000 },
    { name: '5000+', min: 5000, max: Infinity },
  ];

  const bucketResults: BucketResult[] = [];

  for (const bucket of buckets) {
    const latencies = result.rows
      .filter(row => {
        const size = row.request_size_bytes;
        return size >= bucket.min && size < bucket.max;
      })
      .map(row => Number(row.latency_ms));

    if (latencies.length > 0) {
      const percentiles = computePercentiles(latencies, [95]);
      bucketResults.push({
        bucket: bucket.name,
        p95: percentiles[95],
        request_count: latencies.length,
      });
    }
  }

  return bucketResults;
}

/**
 * Gets raw request data, optionally filtered by endpoint
 */
export async function getRawRequestData(endpoint?: string): Promise<RawRequestData[]> {
  const pool = getPool();
  
  if (endpoint) {
    const result = await pool.query<RawRequestData>(
      `SELECT id, endpoint, method, latency_ms, request_size_bytes, 
              response_size_bytes, status_code, created_at
       FROM api_requests
       WHERE endpoint = $1
       ORDER BY created_at DESC`,
      [endpoint]
    );
    return result.rows;
  } else {
    const result = await pool.query<RawRequestData>(
      `SELECT id, endpoint, method, latency_ms, request_size_bytes, 
              response_size_bytes, status_code, created_at
       FROM api_requests
       ORDER BY created_at DESC
       LIMIT 1000`
    );
    return result.rows;
  }
}



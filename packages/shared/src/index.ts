// ============================================
// DELAYT - Shared Types & Utilities
// ============================================

// HTTP Methods supported
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// ============================================
// Endpoint Configuration
// ============================================

export interface EndpointConfig {
  url: string;
  method: HttpMethod;
  payload?: object;
  headers?: Record<string, string>;
  name?: string; // Optional friendly name for the endpoint
}

// ============================================
// Test Run Types
// ============================================

export interface TestRunConfig {
  endpoints: EndpointConfig[];
  requestCount?: number; // Default: 50
  parallel?: boolean; // Default: false (sequential)
  delayBetweenRequests?: number; // ms between requests, default: 0
}

export interface TestRun {
  id: string;
  slug: string; // Shareable URL slug
  endpoints: EndpointConfig[];
  requestCount: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
}

// ============================================
// Request & Result Types
// ============================================

export interface RequestResult {
  endpoint: string;
  method: string;
  latency_ms: number;
  request_size_bytes: number;
  response_size_bytes: number;
  status_code: number;
  error_message?: string;
  run_id?: string;
}

export interface AnalyticsResult {
  endpoint: string;
  method: string;
  name?: string;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  stdDev: number;
  avg_payload_size: number;
  request_count: number;
  error_count: number;
  error_rate: number; // Percentage 0-100
  success_rate: number; // Percentage 0-100
}

export interface BucketResult {
  bucket: string;
  p95: number;
  request_count: number;
}

export interface RawRequestData {
  id: number;
  endpoint: string;
  method: string;
  latency_ms: number;
  request_size_bytes: number;
  response_size_bytes: number;
  status_code: number;
  error_message?: string;
  run_id?: string;
  created_at: Date;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RunResponse {
  runId: string;
  slug: string;
  message: string;
  shareUrl: string;
}

export interface ResultsResponse {
  run?: TestRun;
  results: AnalyticsResult[];
  rawData?: RawRequestData[];
  comparison?: ComparisonResult;
}

// ============================================
// Comparison Types (for historical comparison)
// ============================================

export interface ComparisonResult {
  baseline: AnalyticsResult[];
  current: AnalyticsResult[];
  changes: LatencyChange[];
}

export interface LatencyChange {
  endpoint: string;
  method: string;
  p50Change: number; // Percentage change
  p95Change: number;
  p99Change: number;
  improved: boolean;
  regressed: boolean;
}

// ============================================
// CLI Types
// ============================================

export interface CLIOptions {
  url?: string;
  urls?: string[];
  method?: HttpMethod;
  headers?: Record<string, string>;
  payload?: object;
  count?: number;
  assertP50?: number;
  assertP95?: number;
  assertP99?: number;
  output?: 'json' | 'table' | 'markdown';
  quiet?: boolean;
  share?: boolean;
  shareUrl?: string;
}

export interface CLIResult {
  success: boolean;
  exitCode: number;
  results: AnalyticsResult[];
  assertions: AssertionResult[];
}

export interface AssertionResult {
  type: 'p50' | 'p95' | 'p99';
  endpoint: string;
  expected: number;
  actual: number;
  passed: boolean;
}

export interface RunRequestValidation {
  valid: boolean;
  message?: string;
  count?: number;
}

const VALID_HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const LOCALHOST_HOSTNAMES = new Set(['localhost', 'localhost.localdomain']);

export interface TargetUrlCheck {
  allowed: boolean;
  reason?: string;
}

/** Add http(s):// when the user omits a scheme (e.g. api.example.com/health). */
export function normalizeTargetUrl(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const host = trimmed.split('/')[0]?.split(':')[0]?.replace(/^\[|\]$/g, '').toLowerCase();
  const isLocal =
    LOCALHOST_HOSTNAMES.has(host) || host === '127.0.0.1' || host === '::1';
  return `${isLocal ? 'http' : 'https'}://${trimmed}`;
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (LOCALHOST_HOSTNAMES.has(host) || host.endsWith('.localhost')) return true;
  if (host === '::1' || host === '0.0.0.0') return true;

  const parts = host.split('.').map((p) => Number(p));
  if (parts.length === 4 && parts.every((p) => Number.isInteger(p) && p >= 0 && p <= 255)) {
    const [a, b] = parts;
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }

  return false;
}

export function checkTargetUrl(
  urlString: string,
  options: { blockPrivateTargets?: boolean } = {}
): TargetUrlCheck {
  let parsed: URL;

  try {
    parsed = new URL(normalizeTargetUrl(urlString));
  } catch {
    return { allowed: false, reason: `Invalid URL: ${urlString}` };
  }

  const scheme = parsed.protocol.toLowerCase();
  if (scheme !== 'http:' && scheme !== 'https:') {
    return { allowed: false, reason: 'Only http and https URLs are allowed' };
  }

  if (options.blockPrivateTargets && isPrivateOrLocalHost(parsed.hostname)) {
    return {
      allowed: false,
      reason:
        'localhost and private network URLs cannot be tested from the hosted app. Use a public URL (staging, tunnel, or deploy), or run Delayt locally with npm run dev.',
    };
  }

  return { allowed: true };
}

export function validateRunRequest(
  body: { endpoints?: EndpointConfig[]; requestCount?: number },
  options: {
    maxRequestCount?: number;
    defaultRequestCount?: number;
    maxEndpoints?: number;
    blockPrivateTargets?: boolean;
  } = {}
): RunRequestValidation {
  const {
    maxRequestCount = 200,
    defaultRequestCount = 50,
    maxEndpoints = 10,
    blockPrivateTargets = false,
  } = options;

  const { endpoints, requestCount = defaultRequestCount } = body;

  if (!endpoints || !Array.isArray(endpoints) || endpoints.length === 0) {
    return { valid: false, message: 'At least one endpoint is required' };
  }

  if (endpoints.length > maxEndpoints) {
    return { valid: false, message: `Maximum ${maxEndpoints} endpoints per run` };
  }

  if (requestCount < 1 || requestCount > maxRequestCount) {
    return {
      valid: false,
      message: `Request count must be between 1 and ${maxRequestCount}`,
    };
  }

  for (const ep of endpoints) {
    if (!ep.url) {
      return { valid: false, message: 'Each endpoint must have a URL' };
    }

    const targetCheck = checkTargetUrl(ep.url, { blockPrivateTargets });
    if (!targetCheck.allowed) {
      return { valid: false, message: targetCheck.reason };
    }

    if (!VALID_HTTP_METHODS.includes(ep.method)) {
      return { valid: false, message: `Invalid HTTP method: ${ep.method}` };
    }

    if (
      ['POST', 'PUT', 'PATCH'].includes(ep.method) &&
      ep.payload &&
      typeof ep.payload !== 'object'
    ) {
      return {
        valid: false,
        message: `Payload must be a JSON object for ${ep.method} ${ep.url}`,
      };
    }

    if (ep.headers && typeof ep.headers !== 'object') {
      return { valid: false, message: 'Headers must be a key-value object' };
    }
  }

  return { valid: true, count: requestCount };
}

// ============================================
// Utility Functions
// ============================================

export function generateSlug(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatLatency(ms: number): string {
  if (ms < 1) return `${ms.toFixed(3)}ms`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

export function getLatencyColor(p95: number): 'green' | 'yellow' | 'red' {
  if (p95 < 100) return 'green';
  if (p95 < 500) return 'yellow';
  return 'red';
}

export function calculatePercentageChange(baseline: number, current: number): number {
  if (baseline === 0) return current === 0 ? 0 : 100;
  return ((current - baseline) / baseline) * 100;
}

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

export interface RequestSample {
  latencyMs: number;
  statusCode: number;
  requestSizeBytes?: number;
}

/** Build AnalyticsResult from per-request samples (CLI + server analytics). */
export function buildAnalyticsResult(
  endpoint: string,
  method: string,
  samples: RequestSample[]
): AnalyticsResult {
  const latencies = samples.map((s) => s.latencyMs);
  const payloadSizes = samples.map((s) => s.requestSizeBytes ?? 0);
  let errorCount = 0;

  for (const sample of samples) {
    if (sample.statusCode === 0 || sample.statusCode >= 400) {
      errorCount++;
    }
  }

  const percentiles = computePercentiles(latencies, [50, 95, 99]);
  const avg =
    latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const min = latencies.length > 0 ? Math.min(...latencies) : 0;
  const max = latencies.length > 0 ? Math.max(...latencies) : 0;
  const stdDev = computeStdDev(latencies, avg);
  const avgPayloadSize =
    payloadSizes.length > 0
      ? payloadSizes.reduce((a, b) => a + b, 0) / payloadSizes.length
      : 0;
  const errorRate = latencies.length > 0 ? (errorCount / latencies.length) * 100 : 0;

  return {
    endpoint,
    method: method as HttpMethod,
    p50: percentiles[50],
    p95: percentiles[95],
    p99: percentiles[99],
    min,
    max,
    avg,
    stdDev,
    avg_payload_size: Math.round(avgPayloadSize),
    request_count: latencies.length,
    error_count: errorCount,
    error_rate: Math.round(errorRate * 100) / 100,
    success_rate: Math.round((100 - errorRate) * 100) / 100,
  };
}

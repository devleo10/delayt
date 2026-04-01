// Shared type definitions used by backend and CLI.
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface EndpointConfig {
  url: string;
  method: HttpMethod;
  payload?: object;
  headers?: Record<string, string>;
  name?: string;
}

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
  error_rate: number;
  success_rate: number;
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
}

export interface AssertionResult {
  type: 'p50' | 'p95' | 'p99';
  endpoint: string;
  expected: number;
  actual: number;
  passed: boolean;
}

export interface CLIResult {
  success: boolean;
  exitCode: number;
  results: AnalyticsResult[];
  assertions: AssertionResult[];
}

// Backend-local utility functions mirroring shared behavior.
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

// Backend-specific database types

export interface DbTestRun {
  id: string;
  slug: string;
  endpoints: string; // JSON stringified
  request_count: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
}

export interface DbApiRequest {
  id: number;
  run_id: string | null;
  endpoint: string;
  method: string;
  latency_ms: number;
  request_size_bytes: number;
  response_size_bytes: number;
  status_code: number;
  error_message: string | null;
  created_at: Date;
}



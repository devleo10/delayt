// ============================================
// DELAYR - Shared Types & Utilities
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

export interface EndpointConfig {
  url: string;
  method: 'GET' | 'POST';
  payload?: object;
}

export interface RequestResult {
  endpoint: string;
  method: string;
  latency_ms: number;
  request_size_bytes: number;
  response_size_bytes: number;
  status_code: number;
}

export interface AnalyticsResult {
  endpoint: string;
  method: string;
  p50: number;
  p95: number;
  p99: number;
  avg_payload_size: number;
  request_count: number;
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
  created_at: Date;
}



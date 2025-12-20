export interface ApiEndpoint {
  url: string;
  method: 'GET' | 'POST';
  payload?: any;
}

export interface RequestResult {
  endpoint: string;
  method: string;
  latency_ms: number;
  request_size_bytes: number;
  response_size_bytes: number;
  status_code: number;
}

export interface PercentileStats {
  endpoint: string;
  method: string;
  p50: number;
  p95: number;
  p99: number;
  avg_payload_size: number;
}

export interface PayloadBucket {
  bucket_min: number;
  bucket_max: number;
  p95: number;
  count: number;
}


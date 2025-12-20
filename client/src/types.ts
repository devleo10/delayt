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


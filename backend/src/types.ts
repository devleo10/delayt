// Re-export all shared types
export * from '../../packages/shared/src/index';

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



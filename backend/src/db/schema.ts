import { getPool } from './client';

export async function initializeSchema(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Create api_requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_requests (
        id SERIAL PRIMARY KEY,
        endpoint VARCHAR(2048) NOT NULL,
        method VARCHAR(10) NOT NULL,
        latency_ms NUMERIC(10, 2) NOT NULL,
        request_size_bytes INTEGER NOT NULL,
        response_size_bytes INTEGER NOT NULL,
        status_code INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_endpoint_method 
      ON api_requests(endpoint, method)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_created_at 
      ON api_requests(created_at)
    `);

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function insertRequestResult(result: {
  endpoint: string;
  method: string;
  latency_ms: number;
  request_size_bytes: number;
  response_size_bytes: number;
  status_code: number;
}): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO api_requests 
     (endpoint, method, latency_ms, request_size_bytes, response_size_bytes, status_code)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      result.endpoint,
      result.method,
      result.latency_ms,
      result.request_size_bytes,
      result.response_size_bytes,
      result.status_code,
    ]
  );
}



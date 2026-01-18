import { getPool } from './client';

export async function initializeSchema(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Create test_runs table for tracking run history
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_runs (
        id VARCHAR(64) PRIMARY KEY,
        slug VARCHAR(16) UNIQUE NOT NULL,
        endpoints JSONB NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 50,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create index on slug for shareable links
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_test_runs_slug 
      ON test_runs(slug)
    `);

    // Create api_requests table with run_id reference
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_requests (
        id SERIAL PRIMARY KEY,
        run_id VARCHAR(64) REFERENCES test_runs(id) ON DELETE CASCADE,
        endpoint VARCHAR(2048) NOT NULL,
        method VARCHAR(10) NOT NULL,
        latency_ms NUMERIC(10, 2) NOT NULL,
        request_size_bytes INTEGER NOT NULL,
        response_size_bytes INTEGER NOT NULL,
        status_code INTEGER NOT NULL,
        error_message TEXT,
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

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_run_id 
      ON api_requests(run_id)
    `);

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ============================================
// Test Run Operations
// ============================================

export async function createTestRun(
  id: string,
  slug: string,
  endpoints: object[],
  requestCount: number = 50
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO test_runs (id, slug, endpoints, request_count, status)
     VALUES ($1, $2, $3, $4, 'pending')`,
    [id, slug, JSON.stringify(endpoints), requestCount]
  );
}

export async function updateTestRunStatus(
  id: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  completedAt?: Date
): Promise<void> {
  const pool = getPool();
  if (status === 'running') {
    await pool.query(
      `UPDATE test_runs SET status = $1, started_at = NOW() WHERE id = $2`,
      [status, id]
    );
  } else if (completedAt) {
    await pool.query(
      `UPDATE test_runs SET status = $1, completed_at = $2 WHERE id = $3`,
      [status, completedAt, id]
    );
  } else {
    await pool.query(
      `UPDATE test_runs SET status = $1, completed_at = NOW() WHERE id = $2`,
      [status, id]
    );
  }
}

export async function getTestRunBySlug(slug: string): Promise<any | null> {
  if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
    throw new Error('Invalid slug provided');
  }
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM test_runs WHERE slug = $1`,
    [slug]
  );
  return result.rows[0] || null;
}

export async function getTestRunById(id: string): Promise<any | null> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('Invalid id provided');
  }
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM test_runs WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getRecentTestRuns(limit: number = 10): Promise<any[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM test_runs ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// ============================================
// Request Operations
// ============================================

export async function insertRequestResult(result: {
  run_id?: string;
  endpoint: string;
  method: string;
  latency_ms: number;
  request_size_bytes: number;
  response_size_bytes: number;
  status_code: number;
  error_message?: string;
}): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO api_requests 
     (run_id, endpoint, method, latency_ms, request_size_bytes, response_size_bytes, status_code, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      result.run_id || null,
      result.endpoint,
      result.method,
      result.latency_ms,
      result.request_size_bytes,
      result.response_size_bytes,
      result.status_code,
      result.error_message || null,
    ]
  );
}

export async function getRequestCountForRun(runId: string): Promise<number> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM api_requests WHERE run_id = $1`,
    [runId]
  );
  return parseInt(result.rows[0].count, 10);
}



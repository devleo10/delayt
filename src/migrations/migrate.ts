import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'latency_visualizer',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_requests (
        id SERIAL PRIMARY KEY,
        endpoint VARCHAR(500) NOT NULL,
        method VARCHAR(10) NOT NULL,
        latency_ms NUMERIC(10, 2) NOT NULL,
        request_size_bytes INTEGER NOT NULL,
        response_size_bytes INTEGER NOT NULL,
        status_code INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_endpoint_method ON api_requests(endpoint, method)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_created_at ON api_requests(created_at)
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);


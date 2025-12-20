import { Pool, PoolClient } from 'pg';
import { RequestResult } from './types';

export class Storage {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'latency_visualizer',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
  }

  /**
   * Stores raw request results in Postgres.
   * Uses batch insert for efficiency.
   */
  async saveResults(results: RequestResult[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO api_requests 
        (endpoint, method, latency_ms, request_size_bytes, response_size_bytes, status_code)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      for (const result of results) {
        await client.query(query, [
          result.endpoint,
          result.method,
          result.latency_ms,
          result.request_size_bytes,
          result.response_size_bytes,
          result.status_code,
        ]);
      }

      await client.query('COMMIT');
      console.log(`Saved ${results.length} request results`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to save results:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves all request results for analytics.
   */
  async getAllResults(): Promise<RequestResult[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT endpoint, method, latency_ms, request_size_bytes, 
               response_size_bytes, status_code
        FROM api_requests
        ORDER BY created_at DESC
      `);

      return result.rows.map(row => ({
        endpoint: row.endpoint,
        method: row.method,
        latency_ms: parseFloat(row.latency_ms),
        request_size_bytes: row.request_size_bytes,
        response_size_bytes: row.response_size_bytes,
        status_code: row.status_code,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Closes the database connection pool.
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}


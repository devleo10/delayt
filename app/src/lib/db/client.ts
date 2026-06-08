import { Pool, PoolConfig } from 'pg';

let pool: Pool | null = null;

function getPoolConfig(): PoolConfig {
  if (process.env.DATABASE_URL) {
    const connectionString = process.env.DATABASE_URL;
    const config: PoolConfig = { connectionString };

    const needsSsl =
      connectionString.includes('neon.tech') ||
      connectionString.includes('sslmode=require') ||
      process.env.NODE_ENV === 'production';

    if (needsSsl) {
      config.ssl = { rejectUnauthorized: false };
    }

    return config;
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'latency_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };
}

export function getPool(): Pool {
  if (!pool) {
    const config = getPoolConfig();
    pool = new Pool(config);

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
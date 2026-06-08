import { EndpointConfig, TestRun } from '@delayt/shared';

export function parseEndpoints(endpoints: unknown): EndpointConfig[] {
  if (!endpoints) return [];
  if (typeof endpoints === 'string') {
    try {
      return JSON.parse(endpoints);
    } catch {
      return [];
    }
  }
  if (Array.isArray(endpoints)) {
    return endpoints as EndpointConfig[];
  }
  return [];
}

export function parseTestRun(row: any): TestRun {
  return {
    id: row.id,
    slug: row.slug,
    endpoints: parseEndpoints(row.endpoints),
    requestCount: row.request_count,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}
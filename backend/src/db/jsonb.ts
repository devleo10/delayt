import { EndpointConfig } from '@delayt/shared';

/**
 * PostgreSQL JSONB columns are auto-parsed by `pg` into objects/arrays.
 * This helper accepts either a JSON string or an already-parsed value.
 */
export function parseEndpointsField(value: unknown): EndpointConfig[] {
  if (value == null) {
    return [];
  }
  if (typeof value === 'string') {
    return JSON.parse(value) as EndpointConfig[];
  }
  if (Array.isArray(value)) {
    return value as EndpointConfig[];
  }
  return [];
}

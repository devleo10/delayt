/** Web dashboard limits (Vercel Hobby-safe). Override on server via env. */
export const WEB_DEFAULT_REQUEST_COUNT = 15;
export const WEB_MAX_REQUEST_COUNT = 20;
export const CLI_RECOMMENDED_REQUEST_COUNT = 50;
export const CLI_MAX_REQUEST_COUNT = 200;

export function getServerWebMaxRequestCount(): number {
  const parsed = parseInt(process.env.WEB_MAX_REQUEST_COUNT || '', 10);
  if (Number.isFinite(parsed) && parsed >= 1) return parsed;
  return WEB_MAX_REQUEST_COUNT;
}

export function getServerWebDefaultRequestCount(): number {
  const parsed = parseInt(process.env.WEB_DEFAULT_REQUEST_COUNT || '', 10);
  if (Number.isFinite(parsed) && parsed >= 1) {
    return Math.min(parsed, getServerWebMaxRequestCount());
  }
  return WEB_DEFAULT_REQUEST_COUNT;
}

export function clampWebRequestCount(count: number): number {
  const max = getServerWebMaxRequestCount();
  return Math.min(Math.max(count, 1), max);
}

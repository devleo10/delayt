const COOKIE_NAME = "delayt_runs";
const MAX_RUNS = 40;
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

function readCookieValue(name: string): string | null {
  const prefix = `${name}=`;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(prefix));
  if (!match) return null;
  return decodeURIComponent(match.slice(prefix.length));
}

function writeCookieValue(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function getRunSlugsFromCookie(): string[] {
  const raw = readCookieValue(COOKIE_NAME);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (slug): slug is string =>
        typeof slug === "string" && /^[a-z0-9]+$/.test(slug),
    );
  } catch {
    return [];
  }
}

export function addRunSlugToCookie(slug: string): void {
  if (!/^[a-z0-9]+$/.test(slug)) return;

  const slugs = getRunSlugsFromCookie().filter((s) => s !== slug);
  slugs.unshift(slug);
  writeCookieValue(COOKIE_NAME, JSON.stringify(slugs.slice(0, MAX_RUNS)));
}

export function setRunSlugsInCookie(slugs: string[]): void {
  const valid = slugs.filter(
    (slug) => typeof slug === "string" && /^[a-z0-9]+$/.test(slug),
  );
  writeCookieValue(COOKIE_NAME, JSON.stringify(valid.slice(0, MAX_RUNS)));
}

export function clearRunSlugsFromCookie(): void {
  writeCookieValue(COOKIE_NAME, JSON.stringify([]));
}

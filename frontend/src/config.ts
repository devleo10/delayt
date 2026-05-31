export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const GITHUB_REPO_URL = 'https://github.com/devleo10/delayt';

export function buildShareUrl(slug: string): string {
  return `${window.location.origin.replace(/\/$/, '')}/r/${slug}`;
}

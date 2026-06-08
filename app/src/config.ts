export const API_BASE_URL = '';

export const GITHUB_REPO_URL = 'https://github.com/devleo10/delayt';

export const CREATOR_X_URL = 'https://x.com/_devleo10';
export const CREATOR_HANDLE = '@_devleo10';

export function buildShareUrl(slug: string): string {
  if (typeof window === 'undefined') return `/r/${slug}`;
  return `${window.location.origin}/r/${slug}`;
}
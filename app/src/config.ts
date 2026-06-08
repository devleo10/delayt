import packageJson from '../package.json';

export const API_BASE_URL = '';

/** App release version (sync with app/package.json). */
export const APP_VERSION = packageJson.version;

export const GITHUB_REPO_URL = 'https://github.com/devleo10/delayt';

/** Production site (README, CLI doc links, share examples). */
export const SITE_URL = 'https://www.delayt.foo';

export const CREATOR_X_URL = 'https://x.com/_devleo10';
export const CREATOR_HANDLE = '@_devleo10';

export function buildShareUrl(slug: string): string {
  if (typeof window === 'undefined') return `/r/${slug}`;
  return `${window.location.origin}/r/${slug}`;
}

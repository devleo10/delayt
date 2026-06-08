/** Block localhost/private targets on hosted deploys (Vercel). Local dev stays open. */
export function shouldBlockPrivateTargets(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
}

export function shouldBlockPrivateTargetsClient(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host !== 'localhost' && host !== '127.0.0.1';
}

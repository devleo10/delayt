'use client';

import { CREATOR_HANDLE, CREATOR_X_URL } from '@/config';

interface SiteCreditProps {
  className?: string;
}

export default function SiteCredit({ className }: SiteCreditProps) {
  return (
    <span className={className ? `site-credit ${className}` : 'site-credit'}>
      made by{' '}
      <a href={CREATOR_X_URL} target="_blank" rel="noreferrer">
        {CREATOR_HANDLE}
      </a>
    </span>
  );
}

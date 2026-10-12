'use client';

import { useState } from 'react';

// Company logo from Google's free favicon service (no key). Falls back to an initial in a circle
// when there's no website or the image can't load.
export default function Logo({ domain, name, size = 'sm' }) {
  const [failed, setFailed] = useState(false);
  if (!domain || failed) {
    return (
      <span className={`logo logo-${size} logo-initial`} aria-hidden="true">
        {String(name || '?').trim().charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`logo logo-${size}`}
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
      alt=""
      width={size === 'lg' ? 40 : 28}
      height={size === 'lg' ? 40 : 28}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

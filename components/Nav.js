'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const path = usePathname();
  return (
    <header className="nav">
      <Link href="/" className="wordmark" aria-label="FreshRaise home">
        {/* A sprout rising in front of the sun: fresh money, first thing in the morning */}
        <svg viewBox="0 0 32 24" width="32" height="24" aria-hidden="true">
          <path d="M4 21a12 12 0 0 1 24 0" fill="var(--sun)" />
          <g stroke="var(--ink)" strokeWidth="1.4" strokeLinejoin="round" fill="var(--leaf)">
            <path d="M16 21 V11" fill="none" />
            <path d="M16 15 C12 15 9.5 12 10 8.5 C13.5 8.5 16 11 16 15Z" />
            <path d="M16 12.5 C19 12 22 9.5 21.5 5.5 C18 5.5 16 8.5 16 12.5Z" />
          </g>
          <line x1="0" y1="21.5" x2="32" y2="21.5" stroke="var(--ink)" strokeWidth="1.6" />
        </svg>
        FreshRaise
      </Link>
      <nav>
        <Link href="/" aria-current={path === '/' ? 'page' : undefined}>Morning brief</Link>
        <Link href="/thesis" aria-current={path === '/thesis' ? 'page' : undefined}>Thesis</Link>
      </nav>
    </header>
  );
}

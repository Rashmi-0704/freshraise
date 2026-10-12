'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { runNow } from '@/app/actions';
import { RocketIcon } from './Doodles';

function summarize(r) {
  if (!r.ok) return { tone: 'error', text: `The check stopped early: ${r.error}` };
  if (!r.fundings_found && !r.drafted) {
    return { tone: 'ok', text: `Read ${r.new_articles} new articles. No new seed rounds that fit yet.` };
  }
  const parts = [`Found ${r.fundings_found} new ${r.fundings_found === 1 ? 'round' : 'rounds'}`];
  if (r.rejected) parts.push(`set aside ${r.rejected} that didn’t fit`);
  parts.push(`drafted ${r.drafted} ${r.drafted === 1 ? 'email' : 'emails'}`);
  return { tone: 'ok', text: `${parts.join(', ')}.` };
}

export default function RunButton() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState(null);
  const router = useRouter();
  const buttonRef = useRef(null);

  // The rocket takes off when the check starts, then comes back in to wait for the result
  const launch = () => {
    const rocket = buttonRef.current?.querySelector('.icon-rocket');
    if (!rocket || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap
      .timeline()
      .to(rocket, { y: -28, x: 6, autoAlpha: 0, duration: 0.35, ease: 'power2.in' })
      .fromTo(rocket, { y: 16, x: 0, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4, ease: 'back.out(2)' });
  };

  return (
    <div className="run">
      <button
        ref={buttonRef}
        className={`btn btn-quiet btn-icon${pending ? ' is-launching' : ''}`}
        disabled={pending}
        onClick={() =>
          start(async () => {
            launch();
            setResult(null);
            const r = await runNow();
            setResult(summarize(r));
            router.refresh();
          })
        }
      >
        <RocketIcon />
        {pending ? 'Checking the news…' : 'Check for new rounds'}
      </button>
      {pending && <p className="run-note">Reading feeds, screening with Gemini and drafting. This can take a few minutes.</p>}
      {result && <p className={`run-note run-${result.tone}`} role="status">{result.text}</p>}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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

  return (
    <div className="run">
      <button
        className={`btn btn-quiet btn-icon${pending ? ' is-launching' : ''}`}
        disabled={pending}
        onClick={() =>
          start(async () => {
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

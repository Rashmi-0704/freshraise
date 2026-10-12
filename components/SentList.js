'use client';

import { useState, useTransition } from 'react';
import { markReplied } from '@/app/actions';
import { PlaneIcon } from './Doodles';

function SentRow({ item }) {
  const [replied, setReplied] = useState(Boolean(item.replied_at));
  const [pending, start] = useTransition();
  const toggle = () =>
    start(async () => {
      const next = !replied;
      const r = await markReplied(item.id, next);
      if (r.ok) setReplied(next);
    });

  return (
    <li className={replied ? 'is-replied' : ''}>
      <span className="sent-name">{item.name}</span>
      <span className="sent-when">sent {item.sent_label}</span>
      <button className={`btn btn-small ${replied ? 'btn-replied' : 'btn-ghost'}`} onClick={toggle} disabled={pending}>
        {replied ? '✓ Replied' : 'Mark replied'}
      </button>
    </li>
  );
}

// Every email Rohit has sent, with a one-click way to record a reply.
// The results line is the measurable impact: how many founders wrote back.
export default function SentList({ items, sentTotal, repliedTotal }) {
  if (!sentTotal) return null;
  const rate = Math.round((repliedTotal / sentTotal) * 100);
  return (
    <section className="sent" aria-label="Sent emails">
      <h2>
        <PlaneIcon /> Sent so far
      </h2>
      <p className="sent-results">
        <strong>{sentTotal}</strong> sent → <strong>{repliedTotal}</strong> replied ({rate}%)
      </p>
      <ul>
        {items.map((item) => (
          <SentRow key={item.id} item={item} />
        ))}
      </ul>
      <p className="footnote">FreshRaise never drafts for the same startup twice.</p>
    </section>
  );
}

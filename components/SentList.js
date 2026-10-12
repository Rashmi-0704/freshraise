'use client';

import { useEffect, useState, useTransition } from 'react';
import { markReplied } from '@/app/actions';
import { PlaneIcon } from './Doodles';

function SentRow({ item, onView }) {
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
      <span className="sent-actions">
        <button className="btn btn-small btn-ghost" onClick={() => onView(item)}>
          View email
        </button>
        <button className={`btn btn-small ${replied ? 'btn-replied' : 'btn-ghost'}`} onClick={toggle} disabled={pending}>
          {replied ? '✓ Replied' : 'Mark replied'}
        </button>
      </span>
    </li>
  );
}

// The email exactly as it was sent, in a pop-up
function SentEmail({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`Email sent to ${item.name}`} onClick={onClose}>
      <article className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>
            <PlaneIcon /> Sent to {item.name}
          </h2>
          <button className="panel-close" style={{ display: 'grid', placeItems: 'center' }} onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <dl className="mail-meta">
          <dt>To</dt>
          <dd>{item.to || '—'}</dd>
          <dt>Sent</dt>
          <dd>{item.sent_full}</dd>
          <dt>Subject</dt>
          <dd><strong>{item.subject}</strong></dd>
        </dl>
        <div className="letter-body mail-body">{item.body}</div>
      </article>
    </div>
  );
}

// Every email Rohit has sent: open it to read it again, and record replies.
// The results line is the measurable impact: how many founders wrote back.
export default function SentList({ items, sentTotal, repliedTotal }) {
  const [viewing, setViewing] = useState(null);
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
          <SentRow key={item.id} item={item} onView={setViewing} />
        ))}
      </ul>
      <p className="footnote">FreshRaise never drafts for the same startup twice.</p>
      {viewing && <SentEmail item={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}

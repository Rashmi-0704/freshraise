'use client';

import { useState, useTransition } from 'react';
import SunRing from './SunRing';
import { RoundIcon, PlaneIcon, BuildingIcon, PeopleIcon } from './Doodles';
import { sendDraft, skipDraft } from '@/app/actions';

export default function DraftCard({ draft, now, testMode }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(draft.to_email || '');
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [state, setState] = useState({ status: 'draft' });
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      const r = await sendDraft(draft.id, { to, subject, body });
      setState(r.ok ? { status: 'sent', to: r.to } : { status: 'draft', error: r.error });
    });
  const skip = () =>
    start(async () => {
      await skipDraft(draft.id);
      setState({ status: 'skipped' });
    });

  if (state.status !== 'draft') {
    return (
      <article className={`card card-done${state.status === 'sent' ? ' is-sent' : ''}`}>
        <p>
          {state.status === 'sent' && <PlaneIcon />}
          <strong>{draft.name}</strong>{' '}
          {state.status === 'sent' ? `Sent to ${state.to}.` : 'Skipped. It won’t come back.'}
        </p>
      </article>
    );
  }

  const research = (draft.research_notes || '').split('\n').filter(Boolean);
  const id = `draft-${draft.id}`;

  return (
    <article className={`card${open ? ' is-open' : ''}`}>
      <button className="card-head" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id}>
        <SunRing announcedAt={draft.announced_at} now={now} />
        <span className="card-title">
          <span className="card-name">{draft.name}</span>
          <span className="card-round">
            <span className="chip">
              <RoundIcon round={draft.round_type} />
              {draft.round_type || 'Seed'}
            </span>
            {draft.amount && <span className="amount">{draft.amount}</span>}
            {draft.investors ? ` backed by ${draft.investors}` : ''}
          </span>
          {draft.one_liner && <span className="card-oneliner">{draft.one_liner}</span>}
          <span className="card-meta">{[draft.sector, draft.location].filter(Boolean).join(', ')}</span>
        </span>
        <span className="score" title="Fit with your thesis, out of 100">
          {draft.fit_score}
          <small>fit</small>
        </span>
      </button>
      <p className="reason">{draft.fit_reason}</p>

      {open && (
        <div className="letter" id={id}>
          <div className="dossier">
            <section className="dossier-box">
              <h3><BuildingIcon /> About the company</h3>
              <p>{draft.about || draft.one_liner || 'No background found yet.'}</p>
              <dl className="facts">
                {draft.founded && (<><dt>Founded</dt><dd>{draft.founded}</dd></>)}
                {(draft.hq || draft.location) && (<><dt>Based in</dt><dd>{draft.hq || draft.location}</dd></>)}
                {draft.sector && (<><dt>Sector</dt><dd>{draft.sector}</dd></>)}
                {draft.amount && (<><dt>Raised</dt><dd>{draft.amount}{draft.round_type ? `, ${draft.round_type}` : ''}</dd></>)}
              </dl>
            </section>
            <section className="dossier-box">
              <h3><PeopleIcon /> Who you’re writing to</h3>
              {draft.founder_bios?.length > 0 ? (
                <ul className="people">
                  {draft.founder_bios.map((b) => (
                    <li key={b.name}>
                      <span className="avatar" aria-hidden="true">{b.name.trim().charAt(0)}</span>
                      <span>
                        <strong>{b.name}</strong>
                        {b.role && <span className="role">{b.role}</span>}
                        {b.background && <span className="bio">{b.background}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{draft.founders ? `Founders: ${draft.founders}` : 'Founder names weren’t found. The email greets the team.'}</p>
              )}
            </section>
          </div>

          <label className="field">
            <span>To</span>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={testMode ? 'Optional in test mode' : 'founder@company.com'}
            />
          </label>
          <label className="field">
            <span>Subject</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <textarea
            className="letter-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={Math.min(18, body.split('\n').length + 3)}
            aria-label="Email message"
          />

          {research.length > 0 && (
            <div className="research">
              <h3>What the research found</h3>
              <ul>
                {research.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="links">
            <a href={draft.source_url} target="_blank" rel="noreferrer">
              Read the announcement on {draft.source_name}
            </a>
            {draft.website && (
              <a href={draft.website.startsWith('http') ? draft.website : `https://${draft.website}`} target="_blank" rel="noreferrer">
                Visit their website
              </a>
            )}
          </p>

          {state.error && <p className="form-error" role="alert">{state.error}</p>}

          <div className="actions">
            <button className="btn btn-sun btn-icon" onClick={send} disabled={pending}>
              <PlaneIcon />
              {pending ? 'Sending…' : 'Send email'}
            </button>
            <button className="btn btn-ghost" onClick={skip} disabled={pending}>
              Skip startup
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

'use client';

import { useEffect, useState, useTransition } from 'react';
import SunRing from './SunRing';
import Logo from './Logo';
import { RoundIcon, PlaneIcon, BuildingIcon, PeopleIcon, QuietMorning } from './Doodles';
import { sendDraft, skipDraft } from '@/app/actions';

const WIDE = '(min-width: 900px)';

// The Morning Brief: a compact list of startups on the left, and the selected one's full details
// (background, founders, editable email) in a panel on the right. On phones the panel slides in over the list.
export default function BriefBoard({ drafts, now, testMode, newHours, archiveDays }) {
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState({}); // draft id -> { status: 'sent' | 'skipped', to }

  // On a wide screen, open the first startup so the panel is never empty
  useEffect(() => {
    if (drafts.length && window.matchMedia(WIDE).matches) setSelected((s) => s ?? drafts[0].id);
  }, [drafts]);

  // Esc closes the panel on phones
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !window.matchMedia(WIDE).matches && setSelected(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const finish = (id, result) => {
    setDone((d) => ({ ...d, [id]: result }));
    // Move on to the next startup still waiting
    const next = drafts.find((d) => d.id !== id && !done[d.id]);
    if (result.status === 'skipped') setSelected(next ? next.id : null);
  };

  // An empty folder still shows up, so Rohit always knows where his drafts will land
  if (!drafts.length) {
    return (
      <div className="board board-empty">
        <section className="folder" aria-label="Draft folder">
          <h2 className="folder-title">Draft folder</h2>
          <h3 className="folder-group">
            New today <span>last {newHours} hours · 0</span>
          </h3>
          <div className="folder-empty folder-empty-art">
            <QuietMorning className="empty-art" />
            <p className="hand">Quiet morning. Your draft folder is empty, so enjoy the chai.</p>
            <p>New drafts land here after the next check. Drafts leave the folder {archiveDays} days after the announcement.</p>
          </div>
        </section>
      </div>
    );
  }

  const fresh = drafts.filter((d) => d.is_new);
  const pending = drafts.filter((d) => !d.is_new);
  const list = (items, label) => (
    <ul className="board-list" aria-label={label}>
      {items.map((d) => (
        <li key={d.id}>
          <CardSummary
            draft={d}
            now={now}
            windowDays={archiveDays}
            active={selected === d.id}
            result={done[d.id]}
            onOpen={() => setSelected(d.id)}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <div className={`board${selected ? ' has-selection' : ''}`}>
      {/* Rohit's draft folder: nothing leaves it until he approves (Send) or skips */}
      <section className="folder" aria-label="Draft folder">
        <h2 className="folder-title">Draft folder</h2>
        <h3 className="folder-group">
          New today <span>last {newHours} hours · {fresh.length}</span>
        </h3>
        {fresh.length ? list(fresh, 'New today') : <p className="folder-empty">Nothing new in the last {newHours} hours.</p>}
        {pending.length > 0 && (
          <>
            <h3 className="folder-group is-pending">
              Still pending <span>older · {pending.length}</span>
            </h3>
            {list(pending, 'Still pending')}
            <p className="folder-note">Drafts leave the folder {archiveDays} days after the announcement.</p>
          </>
        )}
      </section>

      <div className="board-panel">
        {drafts.map((d) => (
          // Every panel stays mounted (just hidden), so edits survive switching between startups
          <DraftPanel
            key={d.id}
            draft={d}
            hidden={selected !== d.id}
            testMode={testMode}
            result={done[d.id]}
            onFinish={(r) => finish(d.id, r)}
            onClose={() => setSelected(null)}
          />
        ))}
      </div>
    </div>
  );
}

// The four checks behind the fit score, as small bars (each rated 0-5 by Gemini)
const CHECKS = [
  ['sector', 'Sector'],
  ['stage', 'Stage'],
  ['geography', 'Geography'],
  ['round_size', 'Round size'],
];

function ScoreBars({ parts }) {
  if (!parts) return null;
  return (
    <ul className="bars" aria-label="Why this score">
      {CHECKS.filter(([k]) => parts[k] != null).map(([k, label]) => (
        <li key={k} className={`bar bar-${parts[k] >= 4 ? 'good' : parts[k] >= 3 ? 'ok' : 'low'}`}>
          <span className="bar-label">{label}</span>
          <span className="bar-track" aria-hidden="true">
            <span className="bar-fill" style={{ width: `${(parts[k] / 5) * 100}%` }} />
          </span>
          <span className="bar-value">{parts[k]}/5</span>
        </li>
      ))}
    </ul>
  );
}

// A LinkedIn people search for the founder plus the company, so Rohit can check them in one click
const linkedInSearch = (name, company) =>
  `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${name} ${company}`)}`;

function LinkedInIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" />
      <path d="M7 10v7M7 7v.01M11 17v-4.2c0-1.6 1-2.6 2.3-2.6s2.2 1 2.2 2.6V17M11 10v7" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function CardSummary({ draft, now, windowDays, active, result, onOpen }) {
  return (
    <button
      className={`card card-summary${active ? ' is-active' : ''}${result ? ' is-done' : ''}`}
      onClick={onOpen}
      aria-pressed={active}
      aria-controls={`panel-${draft.id}`}
    >
      <span className="card-head">
        <SunRing announcedAt={draft.announced_at} now={now} windowDays={windowDays} />
        <span className="card-title">
          <span className="card-name">
            <Logo domain={draft.domain} name={draft.name} />
            {draft.name}
          </span>
          <span className="card-round">
            <span className="chip">
              <RoundIcon round={draft.round_type} />
              {draft.round_type || 'Seed'}
            </span>
            {draft.amount && <span className="amount">{draft.amount}</span>}
          </span>
          {draft.one_liner && <span className="card-oneliner">{draft.one_liner}</span>}
          <span className="card-meta">{[draft.sector, draft.location].filter(Boolean).join(', ')}</span>
        </span>
        <span className="score" title="Fit with your thesis, out of 100">
          {draft.fit_score}
          <small>fit</small>
        </span>
      </span>
      {result && (
        <span className="card-status">
          {result.status === 'sent' ? (
            <>
              <PlaneIcon /> Sent
            </>
          ) : (
            'Skipped'
          )}
        </span>
      )}
    </button>
  );
}

function DraftPanel({ draft, hidden, testMode, result, onFinish, onClose }) {
  const [to, setTo] = useState(draft.to_email || '');
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      const r = await sendDraft(draft.id, { to, subject, body });
      if (r.ok) onFinish({ status: 'sent', to: r.to });
      else setError(r.error);
    });
  const skip = () =>
    start(async () => {
      await skipDraft(draft.id);
      onFinish({ status: 'skipped' });
    });

  const research = (draft.research_notes || '').split('\n').filter(Boolean);
  const website = draft.website && (draft.website.startsWith('http') ? draft.website : `https://${draft.website}`);

  return (
    <article id={`panel-${draft.id}`} className="panel" hidden={hidden} aria-label={`${draft.name} details`}>
      <header className="panel-head">
        <div>
          <h2>
            <Logo domain={draft.domain} name={draft.name} size="lg" />
            {draft.name}
          </h2>
          <p className="panel-sub">
            {[draft.round_type, draft.amount].filter(Boolean).join(' · ')}
            {draft.investors ? ` · backed by ${draft.investors}` : ''}
          </p>
        </div>
        <span className="score" title="Fit with your thesis, out of 100">
          {draft.fit_score}
          <small>fit</small>
        </span>
        <button className="panel-close" onClick={onClose} aria-label="Close details">
          ×
        </button>
      </header>
      <p className="reason">{draft.fit_reason}</p>
      <ScoreBars parts={draft.fit_parts} />

      {result ? (
        <p className={`panel-done${result.status === 'sent' ? ' is-sent' : ''}`}>
          {result.status === 'sent' && <PlaneIcon />}
          {result.status === 'sent' ? `Sent to ${result.to}.` : 'Skipped. It won’t come back.'}
        </p>
      ) : (
        <>
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
                        <a className="linkedin" href={linkedInSearch(b.name, draft.name)} target="_blank" rel="noreferrer">
                          <LinkedInIcon /> Find on LinkedIn
                        </a>
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
            rows={Math.min(14, body.split('\n').length + 2)}
            aria-label="Email message"
          />

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="actions">
            <button className="btn btn-sun btn-icon" onClick={send} disabled={pending}>
              <PlaneIcon />
              {pending ? 'Sending…' : 'Send email'}
            </button>
            <button className="btn btn-ghost" onClick={skip} disabled={pending}>
              Skip startup
            </button>
          </div>

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
            {website && (
              <a href={website} target="_blank" rel="noreferrer">
                Visit their website
              </a>
            )}
          </p>
        </>
      )}
    </article>
  );
}

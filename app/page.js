import Horizon from '@/components/Horizon';
import BriefBoard from '@/components/BriefBoard';
import RunButton from '@/components/RunButton';
import SentList from '@/components/SentList';
import { RoundIcon, PenIcon, PlaneIcon } from '@/components/Doodles';
import { sql, ensureSchema } from '@/lib/db';
import { testRecipient } from '@/lib/resend';
import { iso } from '@/lib/util';
import { getUsdInr, inrLabel, rupeesInText } from '@/lib/money';
import { archiveStaleDrafts } from '@/lib/pipeline';
import { ARCHIVE_DAYS, NEW_HOURS, isNew, nextCheckLabel } from '@/lib/schedule';

function parseParts(raw) {
  try {
    const p = JSON.parse(raw || 'null');
    return p && typeof p === 'object' ? p : null;
  } catch {
    return null;
  }
}

function parseBios(raw) {
  try {
    const list = JSON.parse(raw || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // the "Check for new rounds" button runs the pipeline from this page

const IST = 'Asia/Kolkata';

async function load() {
  await ensureSchema();
  await archiveStaleDrafts(); // the folder only holds announcements from the last ARCHIVE_DAYS days
  const usdInr = await getUsdInr();
  const drafts = await sql`
    SELECT d.id, d.to_email, d.founders, d.website, d.domain, d.research_notes, d.subject, d.body,
           d.about, d.founded, d.hq, d.founder_bios,
           s.name, s.one_liner, s.sector, s.location, s.round_type, s.amount, s.investors, s.announced_at,
           s.source_url, s.source_name, s.fit_score, s.fit_reason, s.fit_parts
    FROM drafts d JOIN startups s ON s.id = d.startup_id
    WHERE d.status = 'draft' OR (d.status = 'sending' AND d.sending_at < now() - interval '5 minutes')
    ORDER BY s.announced_at DESC NULLS LAST, s.fit_score DESC`;
  const [run] = await sql`SELECT * FROM runs WHERE finished_at IS NOT NULL ORDER BY id DESC LIMIT 1`;
  const [thesis] = await sql`SELECT sender_name FROM thesis WHERE id = 1`;
  const [{ sent, replied, sent_week }] = await sql`
    SELECT count(*)::int AS sent, count(replied_at)::int AS replied,
           count(*) FILTER (WHERE sent_at >= now() - interval '7 days')::int AS sent_week
    FROM drafts WHERE status = 'sent'`;
  const sentList = await sql`
    SELECT d.id, s.name, d.sent_at, d.replied_at
    FROM drafts d JOIN startups s ON s.id = d.startup_id
    WHERE d.status = 'sent' ORDER BY d.sent_at DESC LIMIT 20`;
  return {
    drafts: drafts.map((d) => {
      const inr = (text) => rupeesInText(text, usdInr); // every amount is shown in rupees, never dollars
      return {
        ...d,
        announced_at: iso(d.announced_at),
        is_new: isNew(d.announced_at), // from the article's publish date
        amount: inrLabel(d.amount, usdInr),
        fit_reason: inr(d.fit_reason),
        about: inr(d.about),
        research_notes: inr(d.research_notes),
        subject: inr(d.subject),
        body: inr(d.body),
        founder_bios: parseBios(d.founder_bios).map((b) => ({ ...b, background: inr(b.background) })),
        fit_parts: parseParts(d.fit_parts),
      };
    }),
    run,
    name: thesis?.sender_name || 'Rohit',
    sent,
    replied,
    sentWeek: sent_week,
    sentList: sentList.map((d) => ({
      id: d.id,
      name: d.name,
      replied_at: iso(d.replied_at),
      sent_label: new Date(d.sent_at).toLocaleString('en-IN', { timeZone: IST, day: 'numeric', month: 'short' }),
    })),
  };
}

function greeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function runSentence(run) {
  if (!run) return 'No checks yet. Run the first one to fill your brief.';
  const when = new Date(run.finished_at).toLocaleString('en-IN', {
    timeZone: IST, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
  let s = `Last checked ${when}. Read ${run.articles_scanned} articles, found ${run.fundings_found} new seed ${run.fundings_found === 1 ? 'round' : 'rounds'}`;
  if (run.rejected) s += `, set aside ${run.rejected} that didn’t fit`;
  if (run.duplicates) s += `, and skipped ${run.duplicates} already in your pipeline`;
  return `${s}.`;
}

export default async function Home() {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: IST }).format(new Date()));
  let data;
  let setupError;
  try {
    data = await load();
  } catch (err) {
    setupError = err.message;
  }
  const now = Date.now();
  const testTo = testRecipient();
  const newCount = data ? data.drafts.filter((d) => d.is_new).length : 0;
  const pendingCount = data ? data.drafts.length - newCount : 0;

  return (
    <main>
      <section className="hero">
        <Horizon hour={hour} />
        <div className="wrap wrap-wide hero-text">
          <p className="hello">{greeting(hour)}, {data?.name || 'Rohit'}.</p>
          <h1>
            {setupError ? (
              'Almost ready.'
            ) : newCount > 0 ? (
              <>
                <span className="mark">
                  {newCount} {newCount === 1 ? 'founder' : 'founders'}
                </span>{' '}
                raised in the last {NEW_HOURS} hours and fit your thesis.
              </>
            ) : pendingCount > 0 ? (
              <>
                No new rounds in the <span className="mark">last {NEW_HOURS} hours.</span>
              </>
            ) : (
              <>
                You’re all <span className="mark">caught up.</span>
              </>
            )}
          </h1>
          {!setupError && (
            <p className="lede">
              {newCount > 0
                ? `Their drafts are in your folder, researched and ready.${
                    pendingCount ? ` ${pendingCount} older ${pendingCount === 1 ? 'draft is' : 'drafts are'} still pending.` : ''
                  }`
                : pendingCount > 0
                  ? `${pendingCount} ${pendingCount === 1 ? 'draft' : 'drafts'} from earlier this week ${pendingCount === 1 ? 'is' : 'are'} still pending in your folder. Drafts leave the folder ${ARCHIVE_DAYS} days after the announcement.`
                  : 'Fresh drafts land in your folder every morning. You can also check right now.'}
            </p>
          )}
        </div>
      </section>

      <div className="wrap wrap-wide">
        {setupError ? (
          <div className="notice notice-error">
            <h2>Connect the database</h2>
            <p>{setupError}</p>
            <p>Add the environment variables from the README in Vercel, then redeploy.</p>
          </div>
        ) : (
          <>
            <div className="status">
              <p>{runSentence(data.run)}</p>
              <p className="status-next">
                <strong>Next automatic check:</strong> {nextCheckLabel(now)}
              </p>
              {data.run?.error && <p className="status-error">Last check hit a problem: {data.run.error}</p>}
              <RunButton />
            </div>

            {testTo && (
              <p className="notice">
                Test mode is on. Sent emails go to {testTo} instead of founders, with the founder’s address in the subject.
              </p>
            )}

            <ul className="tiles" aria-label="At a glance">
              <li className="tile tile-new">
                <RoundIcon round="seed" />
                <strong>{newCount}</strong>
                <span>New today</span>
              </li>
              <li className="tile tile-waiting">
                <PenIcon />
                <strong>{data.drafts.length}</strong>
                <span>Waiting in your folder</span>
              </li>
              <li className="tile tile-sent">
                <PlaneIcon />
                <strong>{data.sentWeek}</strong>
                <span>Sent this week</span>
              </li>
            </ul>

            <BriefBoard
              drafts={data.drafts}
              now={now}
              testMode={Boolean(testTo)}
              newHours={NEW_HOURS}
              archiveDays={ARCHIVE_DAYS}
            />

            <SentList items={data.sentList} sentTotal={data.sent} repliedTotal={data.replied} />
          </>
        )}
      </div>
    </main>
  );
}

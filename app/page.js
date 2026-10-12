import Horizon from '@/components/Horizon';
import DraftCard from '@/components/DraftCard';
import RunButton from '@/components/RunButton';
import RunMap from '@/components/RunMap';
import { QuietMorning } from '@/components/Doodles';
import { FEEDS } from '@/lib/feeds';
import { LOOKBACK_HOURS } from '@/lib/pipeline';
import { sql, ensureSchema } from '@/lib/db';
import { testRecipient } from '@/lib/resend';
import { iso } from '@/lib/util';
import { getUsdInr, inrLabel, rupeesInText } from '@/lib/money';

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
  const usdInr = await getUsdInr();
  const drafts = await sql`
    SELECT d.id, d.to_email, d.founders, d.website, d.research_notes, d.subject, d.body,
           d.about, d.founded, d.hq, d.founder_bios,
           s.name, s.one_liner, s.sector, s.location, s.round_type, s.amount, s.investors, s.announced_at,
           s.source_url, s.source_name, s.fit_score, s.fit_reason
    FROM drafts d JOIN startups s ON s.id = d.startup_id
    WHERE d.status = 'draft' OR (d.status = 'sending' AND d.sending_at < now() - interval '5 minutes')
    ORDER BY s.announced_at DESC NULLS LAST, s.fit_score DESC`;
  const [run] = await sql`SELECT * FROM runs WHERE finished_at IS NOT NULL ORDER BY id DESC LIMIT 1`;
  const [thesis] = await sql`SELECT sender_name, min_fit_score FROM thesis WHERE id = 1`;
  const [{ sent }] = await sql`SELECT count(*)::int AS sent FROM drafts WHERE status = 'sent'`;
  return {
    drafts: drafts.map((d) => {
      const inr = (text) => rupeesInText(text, usdInr); // every amount is shown in rupees, never dollars
      return {
        ...d,
        announced_at: iso(d.announced_at),
        amount: inrLabel(d.amount, usdInr),
        fit_reason: inr(d.fit_reason),
        about: inr(d.about),
        research_notes: inr(d.research_notes),
        subject: inr(d.subject),
        body: inr(d.body),
        founder_bios: parseBios(d.founder_bios).map((b) => ({ ...b, background: inr(b.background) })),
      };
    }),
    run,
    name: thesis?.sender_name || 'Rohit',
    minScore: thesis?.min_fit_score ?? 65,
    usdInr,
    sent,
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

  return (
    <main>
      <section className="hero">
        <Horizon hour={hour} />
        <div className="wrap hero-text">
          <p className="hello">{greeting(hour)}, {data?.name || 'Rohit'}.</p>
          <h1>
            {setupError
              ? 'Almost ready.'
              : data.drafts.length === 0
                ? <>You’re all <span className="mark">caught up.</span></>
                : (
                  <>
                    <span className="mark">
                      {data.drafts.length} {data.drafts.length === 1 ? 'founder' : 'founders'}
                    </span>{' '}
                    just raised and fit your thesis.
                  </>
                )}
          </h1>
          {!setupError && (
            <p className="lede">
              {data.drafts.length
                ? 'Each draft is researched and ready. Open one, adjust anything, and send.'
                : 'New drafts appear here every morning. You can also check right now.'}
            </p>
          )}
        </div>
      </section>

      <div className="wrap">
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
              {data.run?.error && <p className="status-error">Last check hit a problem: {data.run.error}</p>}
              <RunButton />
            </div>

            {testTo && (
              <p className="notice">
                Test mode is on. Sent emails go to {testTo} instead of founders, with the founder’s address in the subject.
              </p>
            )}

            <section className="list" aria-label="Draft emails">
              {data.drafts.map((d) => (
                <DraftCard key={d.id} draft={d} now={now} testMode={Boolean(testTo)} />
              ))}
            </section>

            {data.drafts.length === 0 && (
              <div className="empty">
                <QuietMorning className="empty-art" />
                <p className="hand">Quiet morning. No fresh rounds yet, so enjoy the chai.</p>
              </div>
            )}

            <RunMap
              run={data.run}
              feedCount={FEEDS.length}
              lookbackHours={LOOKBACK_HOURS}
              minScore={data.minScore}
              usdInr={data.usdInr}
              waiting={data.drafts.length}
              sent={data.sent}
            />

            {data.sent > 0 && (
              <p className="footnote">
                {data.sent} {data.sent === 1 ? 'founder has' : 'founders have'} been contacted so far. FreshRaise never drafts
                for the same startup twice.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

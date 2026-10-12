import Logo from '@/components/Logo';
import { RocketIcon, RoundIcon, PlaneIcon, BuildingIcon } from '@/components/Doodles';
import { ensureSchema } from '@/lib/db';
import { getUsdInr, inrLabel, rupeesInText } from '@/lib/money';
import { latestNews, todaysSummary, fundingStats, missedRounds, trackedInNews } from '@/lib/pulse';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // the first visit of the day asks Gemini for the summary

const IST = 'Asia/Kolkata';
const when = (iso) => {
  const hours = (Date.now() - new Date(iso).getTime()) / 3.6e6;
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric', month: 'short' });
};

export default async function PulsePage() {
  let data;
  let error;
  try {
    await ensureSchema();
    const usdInr = await getUsdInr();
    // Headlines keep their wording, but any dollar amount is shown in rupees like the rest of the app
    const news = (await latestNews()).map((n) => ({ ...n, title: rupeesInText(n.title, usdInr) }));
    const [summary, stats, missed, tracked] = await Promise.all([
      todaysSummary(news),
      fundingStats(usdInr),
      missedRounds(),
      trackedInNews(news),
    ]);
    data = { news, summary, stats, missed: missed.map((m) => ({ ...m, amount: inrLabel(m.amount, usdInr) })), tracked };
  } catch (err) {
    error = err.message;
  }
  const today = new Date().toLocaleDateString('en-IN', { timeZone: IST, weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <main className="wrap wrap-wide pulse">
      <h1>
        Startup <span className="mark">pulse</span>
      </h1>
      <p className="lede">What’s moving in the startup world, rounds you missed, and how your startups are doing.</p>

      {error && <p className="notice notice-error">{error}</p>}

      {data && (
        <>
          <section className="pulse-today">
            <h2>
              <RocketIcon /> Today in startups <span>{today}</span>
            </h2>
            {data.summary.length ? (
              <ul>
                {data.summary.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            ) : (
              <p className="thint">Today’s summary isn’t ready yet. It’s written from the morning’s headlines.</p>
            )}
            <p className="pulse-credit">Summarised by Gemini from {Math.min(50, data.news.length)} headlines across your 10 feeds.</p>
          </section>

          <ul className="tiles" aria-label="Your fits in the last 30 days">
            <li className="tile tile-new">
              <RoundIcon round="seed" />
              <strong data-count={data.stats.fits}>{data.stats.fits}</strong>
              <span>Fits found · 30 days</span>
            </li>
            <li className="tile tile-waiting">
              <BuildingIcon />
              <strong>{data.stats.raised}</strong>
              <span>Raised by your fits</span>
            </li>
            <li className="tile tile-sent">
              <PlaneIcon />
              <strong data-count={data.stats.sent}>{data.stats.sent}</strong>
              <span>Of them contacted</span>
            </li>
          </ul>
          {data.stats.topSectors.length > 0 && (
            <p className="pulse-sectors">
              Top sectors among your fits:{' '}
              {data.stats.topSectors.map(([s, n]) => (
                <span key={s} className="chip">
                  {s} · {n}
                </span>
              ))}
            </p>
          )}

          <div className="pulse-grid">
            <section className="pulse-card">
              <h2>Latest startup news</h2>
              <ul className="news">
                {data.news.slice(0, 14).map((n) => (
                  <li key={n.url}>
                    <a href={n.url} target="_blank" rel="noreferrer">
                      {n.title}
                    </a>
                    <span>
                      {n.source} · {when(n.at)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="pulse-side">
              <section className="pulse-card">
                <h2>Rounds you missed</h2>
                <p className="thint">Good fits that left your folder after 7 days without an email.</p>
                {data.missed.length ? (
                  <ul className="mini-list">
                    {data.missed.map((m) => (
                      <li key={m.name}>
                        <Logo domain={m.domain} name={m.name} />
                        <span>
                          <strong>{m.name}</strong>
                          <small>
                            {[m.round_type, m.amount].filter(Boolean).join(' · ')} · fit {m.fit_score} ·{' '}
                            {new Date(m.announced_at).toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric', month: 'short' })}
                          </small>
                        </span>
                        {m.source_url && (
                          <a href={m.source_url} target="_blank" rel="noreferrer">
                            Read
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pulse-empty">Nothing missed so far. Every fit was emailed or is still in your folder.</p>
                )}
              </section>

              <section className="pulse-card">
                <h2>Your startups in the news</h2>
                <p className="thint">Latest headlines about startups you’ve drafted for or emailed.</p>
                {data.tracked.length ? (
                  <ul className="mini-list">
                    {data.tracked.map((t) => (
                      <li key={t.name} className="tracked">
                        <Logo domain={t.domain} name={t.name} />
                        <span>
                          <strong>
                            {t.name} <em className={`tag tag-${t.status}`}>{t.status === 'sent' ? 'emailed' : t.status === 'draft' ? 'in folder' : 'missed'}</em>
                          </strong>
                          {t.hits.length ? (
                            t.hits.map((h) => (
                              <a key={h.url} href={h.url} target="_blank" rel="noreferrer">
                                {h.title} <small>· {h.source}, {when(h.at)}</small>
                              </a>
                            ))
                          ) : (
                            <small>No new headlines in today’s feeds.</small>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pulse-empty">Once you draft or email startups, their latest news shows up here.</p>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

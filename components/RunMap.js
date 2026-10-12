// "How this brief was made": the components map, filled in with numbers from the last run.
// Same six steps and lane colours as docs/components-map.svg.

const IST = 'Asia/Kolkata';
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default function RunMap({ run, feedCount, lookbackHours, minScore, usdInr, waiting, sent }) {
  if (!run) return null;
  const when = new Date(run.finished_at).toLocaleString('en-IN', {
    timeZone: IST, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
  const steps = [
    {
      key: 'trigger',
      label: 'Trigger',
      main: run.trigger === 'cron' ? 'Daily 6:00 am run' : 'You clicked Check',
      sub: `${when} · next automatic run 6:00 am IST`,
    },
    {
      key: 'input',
      label: 'Input',
      main: plural(run.articles_scanned, 'article', 'articles'),
      sub: `from ${feedCount} live news feeds${run.sources_ok ? `: ${run.sources_ok}` : ''}`,
    },
    {
      key: 'context',
      label: 'Context',
      main: `Thesis, min fit ${minScore}`,
      sub: `Live rate ₹${usdInr.toFixed(2)} per US dollar, so every amount is in ₹`,
    },
    {
      key: 'processing',
      label: 'Processing',
      main: `${plural(run.new_articles, 'new funding story', 'new funding stories')}`,
      sub: `from the last ${lookbackHours} hours · ${plural(run.duplicates, 'repeat', 'repeats')} blocked`,
    },
    {
      key: 'ai',
      label: 'AI · Gemini',
      main: plural(run.fundings_found, 'new seed round', 'new seed rounds'),
      sub: `${run.rejected} set aside as not a fit · ${plural(run.drafted, 'email', 'emails')} drafted`,
    },
    {
      key: 'output',
      label: 'Output',
      main: plural(waiting, 'draft', 'drafts') + ' waiting for you',
      sub: `${sent} sent so far · nothing sends without your click`,
    },
  ];

  return (
    <section className="runmap" aria-label="How this brief was made">
      <h2 className="runmap-title">How this brief was made</h2>
      <ol>
        {steps.map((s) => (
          <li key={s.key} className={`runmap-step runmap-${s.key}`}>
            <span className="runmap-label">{s.label}</span>
            <strong>{s.main}</strong>
            <span className="runmap-sub">{s.sub}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

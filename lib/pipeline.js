import { sql, ensureSchema, getThesis } from './db';
import { fetchAllFeeds } from './feeds';
import { gemini } from './gemini';
import { nameKey, domainKey, mapLimit, iso } from './util';

// 26h, not 24h: the daily cron can fire anywhere in its hour, so a small overlap means nothing slips through.
// Overlap is safe because seen URLs and startup names are never processed twice.
const LOOKBACK_HOURS = Number(process.env.LOOKBACK_HOURS || 26);
const MAX_ARTICLES = Number(process.env.MAX_ARTICLES_PER_RUN || 100);
const MAX_DRAFTS = Number(process.env.MAX_DRAFTS_PER_RUN || 10);
// Vercel allows 300s per function (maxDuration); stop 30s early so the run always logs itself
const TIME_BUDGET_MS = Number(process.env.TIME_BUDGET_MS || 270000);

// Cheap keyword pre-filter so Gemini only reads articles that could be funding news
const FUNDING_HINT = /(rais|fund|seed|round|secur|bags|angel|invest|backed|crore|lakh|million|\$|₹)/i;
const LATE_STAGE = /\bseries\s+[b-h]\b|\bipo\b/i;

/* ---------- Gemini prompts ---------- */

const CLASSIFY_SYSTEM = `You screen startup news for an accelerator.
From the numbered articles, return ONLY genuine announcements of a PRE-SEED, SEED or ANGEL funding round
by a startup that is either based in India OR has Indian / Indian-origin founders (based anywhere in the world).
Ignore Series A and later, debt-only deals, fund launches, opinion pieces, roundups of many deals with no single company,
and anything where the startup can't be named. If several articles cover the same startup, return it once.
Return a JSON array. Each item:
{"index": number, "startup_name": string, "round_type": "Pre-seed"|"Seed"|"Angel",
 "amount": string (e.g. "$1.2M" or "Rs 8 crore", "" if unknown), "investors": string,
 "sector": string, "location": string (city, country), "indian_link": string (why it qualifies),
 "one_liner": string (what the startup does, under 20 words)}
Return [] if nothing qualifies.`;

const SCORE_SYSTEM = `You score freshly funded startups against an accelerator's investment thesis.
Score each 0-100 for how well it fits, checking four things: sector, stage, geography and round size.
Use this scale so scores are consistent from day to day:
- 90-100: all four match clearly.
- 75-89: three match; the fourth is unknown or only slightly off.
- 55-74: one clear mismatch (for example the round is above the size range, or the sector is adjacent, not listed).
- 30-54: two or more clear mismatches.
- 0-29: matches anything in the exclusions.
Missing details are neutral, not negative. The reason must be one specific sentence naming what matched or didn't.
Return a JSON array: [{"index": number, "score": number, "reason": string}]`;

/* ---------- Steps ---------- */

// Gemini sometimes wraps the array, e.g. {"results": [...]}
const asArray = (out) => (Array.isArray(out) ? out : Object.values(out || {}).find(Array.isArray) || []);

async function classify(articles, deadline) {
  const found = [];
  // 100 short articles fit comfortably in one call, which saves free-tier requests
  for (let i = 0; i < articles.length; i += 100) {
    const chunk = articles.slice(i, i + 100);
    const list = chunk
      .map((a, j) => `[${i + j}] ${a.title}\n${a.snippet.slice(0, 280)}\n(source: ${a.source}, published: ${iso(a.publishedAt)})`)
      .join('\n\n');
    const out = await gemini({ system: CLASSIFY_SYSTEM, prompt: list, fast: true, temperature: 0, deadline });
    found.push(...asArray(out));
  }
  return found
    .filter((f) => f && Number.isInteger(f.index) && articles[f.index] && f.startup_name)
    .map((f) => ({ ...f, article: articles[f.index] }));
}

function thesisBlock(t) {
  return `ACCELERATOR: ${t.accelerator_name}
SECTORS WE LIKE: ${t.sectors}
STAGES: ${t.stages}
GEOGRAPHY: ${t.geography}
ROUND SIZE: ${t.round_size}
EXCLUSIONS: ${t.exclusions}
PROGRAM: ${t.program_pitch}`;
}

async function scoreStartups(startups, thesis, deadline) {
  if (!startups.length) return { fit: 0, rejected: 0 };
  const candidates = startups.map((s, index) => ({
    index,
    name: s.name,
    round: s.round_type,
    amount: s.amount,
    sector: s.sector,
    location: s.location,
    indian_link: s.indian_link,
    what_they_do: s.one_liner,
    investors: s.investors,
  }));
  const out = await gemini({
    system: SCORE_SYSTEM,
    prompt: `${thesisBlock(thesis)}\n\nCANDIDATES:\n${JSON.stringify(candidates, null, 2)}`,
    fast: true,
    temperature: 0, // same startup, same thesis, same score
    deadline,
  });

  let fit = 0;
  let rejected = 0;
  for (const r of asArray(out)) {
    const s = startups[r.index];
    if (!s) continue;
    const score = Math.max(0, Math.min(100, Math.round(Number(r.score) || 0)));
    const status = score >= thesis.min_fit_score ? 'fit' : 'rejected';
    status === 'fit' ? fit++ : rejected++;
    await sql`UPDATE startups SET fit_score = ${score}, fit_reason = ${r.reason || ''}, status = ${status} WHERE id = ${s.id}`;
  }
  return { fit, rejected };
}

function draftPrompt(s, t) {
  return `Research this freshly funded startup, then write a cold outreach email.

STARTUP: ${s.name}
WHAT THEY DO: ${s.one_liner}
ROUND: ${s.round_type} ${s.amount ? `of ${s.amount}` : ''} ${s.investors ? `from ${s.investors}` : ''}
SECTOR: ${s.sector}  LOCATION: ${s.location}
NEWS HEADLINE: ${s.source_title}
WHY IT FITS OUR THESIS: ${s.fit_reason}

SENDER: ${t.sender_name}, ${t.sender_title} at ${t.accelerator_name}
PROGRAM: ${t.program_pitch}

Find the company website, the founders' names, and one or two concrete details about the product or traction.
Then write the email:
- Under 150 words, warm and specific, no hype, no buzzwords.
- Open by congratulating them on the round, naming the amount or lead investor if known.
- Mention one specific detail about their product to show real research.
- Explain in one or two sentences why ${t.accelerator_name} is useful right after a raise.
- Close with a low-pressure ask for a 15-minute call this week or next.
- Greet founders by first name if you found them, otherwise "Hi ${s.name} team". Never use placeholders like [Name].
- Sign off with ${t.sender_name}, ${t.sender_title}, ${t.accelerator_name}.

Return ONLY a JSON object, no other text:
{"website": string, "founders": string, "contact_email": string (only if publicly listed, else ""),
 "research": [string, string, string] (short facts you learned), "subject": string, "body": string}`;
}

async function draftEmail(s, thesis, deadline) {
  const prompt = draftPrompt(s, thesis);
  const useSearch = process.env.GEMINI_SEARCH !== 'false';
  let out;
  try {
    out = await gemini({ prompt, search: useSearch, temperature: 0.6, deadline });
  } catch (err) {
    // Fall back to no web research, but only if there's still time for a second call
    if (!useSearch || deadline - Date.now() < 15000) throw err;
    out = await gemini({ prompt, search: false, temperature: 0.6, deadline });
  }
  if (!out?.subject || !out?.body) throw new Error(`Draft for ${s.name} came back incomplete.`);

  const research = Array.isArray(out.research) ? out.research.filter(Boolean).join('\n') : String(out.research || '');
  const domain = domainKey(out.website);
  // Second duplicate guard: a website domain can only ever have one draft, which catches the same
  // startup reported under two spellings ("Krishi Labs" vs "KrishiLabs AI").
  const rows = await sql`
    INSERT INTO drafts (startup_id, to_email, founders, website, domain, research_notes, subject, body)
    VALUES (${s.id}, ${out.contact_email || ''}, ${out.founders || ''}, ${out.website || ''}, ${domain}, ${research}, ${out.subject}, ${out.body})
    ON CONFLICT DO NOTHING
    RETURNING id`;
  await sql`UPDATE startups SET status = ${rows.length ? 'drafted' : 'duplicate'} WHERE id = ${s.id}`;
  return rows.length > 0;
}

/* ---------- The full run ---------- */

export async function runPipeline(trigger = 'manual') {
  const started = Date.now();
  const deadline = started + TIME_BUDGET_MS; // every Gemini call stops before this
  const timeLeft = () => deadline - Date.now();
  await ensureSchema();
  const stats = { articles_scanned: 0, new_articles: 0, fundings_found: 0, duplicates: 0, rejected: 0, drafted: 0 };

  // A run Vercel killed mid-way never logs itself as finished. Close those off so they don't block new runs.
  await sql`
    UPDATE runs SET finished_at = now(), error = 'Stopped before finishing (timed out).'
    WHERE finished_at IS NULL AND started_at < now() - interval '10 minutes'`;
  // Don't start a second run while one is going (double click, or the button during the cron)
  const busy = await sql`SELECT id FROM runs WHERE finished_at IS NULL LIMIT 1`;
  if (busy.length) return { ok: false, error: 'A check is already running. Try again in a minute.', ...stats, seconds: 0 };

  const [run] = await sql`INSERT INTO runs (trigger) VALUES (${trigger}) RETURNING id`;
  let sourcesOk = [];
  let error = null;

  try {
    // Thesis is read fresh from the database on every run
    const thesis = await getThesis();

    // 1. Listen: pull every feed in parallel
    const feed = await fetchAllFeeds();
    sourcesOk = feed.sourcesOk;
    stats.articles_scanned = feed.items.length;

    // 2. Keep only recent, funding-looking, never-seen articles
    const cutoff = Date.now() - LOOKBACK_HOURS * 3600 * 1000;
    const byUrl = new Map();
    const byTitle = new Set();
    for (const a of feed.items) {
      if (!a.publishedAt || a.publishedAt.getTime() < cutoff) continue;
      const text = `${a.title} ${a.snippet}`;
      if (!FUNDING_HINT.test(text) || LATE_STAGE.test(a.title)) continue;
      const titleKey = a.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
      if (byUrl.has(a.url) || byTitle.has(titleKey)) continue;
      byUrl.set(a.url, a);
      byTitle.add(titleKey);
    }
    let candidates = [...byUrl.values()];
    if (candidates.length) {
      const seen = await sql`SELECT url FROM articles WHERE url = ANY(${candidates.map((a) => a.url)})`;
      const seenSet = new Set(seen.map((r) => r.url));
      candidates = candidates.filter((a) => !seenSet.has(a.url));
    }
    candidates = candidates.sort((a, b) => b.publishedAt - a.publishedAt).slice(0, MAX_ARTICLES);
    stats.new_articles = candidates.length;

    // 3. Gemini picks out real pre-seed / seed / angel announcements
    const fundings = candidates.length ? await classify(candidates, deadline) : [];

    if (candidates.length) {
      await sql`
        INSERT INTO articles (url, title, source, published_at)
        SELECT * FROM unnest(
          ${candidates.map((a) => a.url)}::text[],
          ${candidates.map((a) => a.title)}::text[],
          ${candidates.map((a) => a.source)}::text[],
          ${candidates.map((a) => iso(a.publishedAt))}::timestamptz[])
        ON CONFLICT (url) DO NOTHING`;
    }

    // 4. Never-contact-twice check: the startup's name key is unique in the database
    const inBatch = new Set();
    for (const f of fundings) {
      const key = nameKey(f.startup_name);
      if (!key || inBatch.has(key)) continue;
      inBatch.add(key);
      const a = f.article;
      const rows = await sql`
        INSERT INTO startups (name_key, name, sector, location, round_type, amount, investors, indian_link, one_liner,
                              announced_at, source_url, source_title, source_name)
        VALUES (${key}, ${f.startup_name}, ${f.sector || ''}, ${f.location || ''}, ${f.round_type || 'Seed'},
                ${f.amount || ''}, ${f.investors || ''}, ${f.indian_link || ''}, ${f.one_liner || ''},
                ${iso(a.publishedAt)}, ${a.url}, ${a.title}, ${a.source})
        ON CONFLICT (name_key) DO NOTHING
        RETURNING id`;
      if (rows.length) stats.fundings_found++;
      else stats.duplicates++;
    }

    // 5. Score everything not yet scored (includes leftovers from an interrupted run)
    const unscored = await sql`SELECT * FROM startups WHERE status = 'new' ORDER BY announced_at DESC NULLS LAST LIMIT 25`;
    if (unscored.length && timeLeft() > 15000) {
      const { rejected } = await scoreStartups(unscored, thesis, deadline);
      stats.rejected = rejected;
    }

    // 6. Research and draft for every fit without a draft, newest first, within the time budget
    const toDraft = await sql`
      SELECT s.* FROM startups s LEFT JOIN drafts d ON d.startup_id = s.id
      WHERE s.status = 'fit' AND d.id IS NULL
      ORDER BY s.announced_at DESC NULLS LAST
      LIMIT ${MAX_DRAFTS}`;
    const draftErrors = [];
    await mapLimit(toDraft, 2, async (s) => {
      // A researched draft can take 20s, so don't start one we can't finish. The next run picks these up.
      if (timeLeft() < 20000) return;
      try {
        if (await draftEmail(s, thesis, deadline)) stats.drafted++;
        else stats.duplicates++;
      } catch (err) {
        draftErrors.push(err.message);
      }
    });
    if (draftErrors.length && !stats.drafted) error = draftErrors[0];
  } catch (err) {
    error = err.message || String(err);
  }

  await sql`
    UPDATE runs SET finished_at = now(), articles_scanned = ${stats.articles_scanned}, new_articles = ${stats.new_articles},
      fundings_found = ${stats.fundings_found}, duplicates = ${stats.duplicates}, rejected = ${stats.rejected},
      drafted = ${stats.drafted}, sources_ok = ${sourcesOk.join(', ')}, error = ${error}
    WHERE id = ${run.id}`;

  return { ok: !error, error, ...stats, seconds: Math.round((Date.now() - started) / 1000) };
}

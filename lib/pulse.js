// Data for the Pulse page: what's happening in the startup world, using what FreshRaise already reads.
// Startups that didn't fit the thesis never appear here, not even in totals (the brief: never shown to Rohit).
import { sql } from './db';
import { fetchAllFeeds } from './feeds';
import { gemini } from './gemini';
import { amountToInr, formatInr } from './money';

const NEWS_CACHE_MS = 30 * 60 * 1000;
let newsCache = { at: 0, items: [] };

// Names of startups that didn't fit; any headline about them is left out of Pulse
async function rejectedNames() {
  const rows = await sql`SELECT name FROM startups WHERE status IN ('rejected', 'duplicate')`;
  return rows.map((r) => r.name.toLowerCase()).filter((n) => n.length >= 4);
}

// Latest headlines from the same 10 feeds, newest first, kept for 30 minutes per server instance.
// Headlines about startups that didn't fit are filtered out.
export async function latestNews() {
  if (Date.now() - newsCache.at < NEWS_CACHE_MS && newsCache.items.length) return newsCache.items;
  const [{ items }, hidden] = await Promise.all([fetchAllFeeds(), rejectedNames()]);
  const seen = new Set();
  const list = items
    .filter((a) => a.publishedAt)
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .filter((a) => !hidden.some((name) => a.title.toLowerCase().includes(name)))
    .filter((a) => {
      const key = a.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((a) => ({ title: a.title, url: a.url, source: a.source, at: a.publishedAt.toISOString() }));
  newsCache = { at: Date.now(), items: list };
  return list;
}

const SUMMARY_SYSTEM = `You write a short morning briefing for an accelerator's recruitment lead in India.
From the numbered startup news headlines, write 4 bullet points on what is happening in the startup world today:
funding activity and notable rounds, sectors that are hot, and any company doing notably well or badly.
Focus on India first, then global. Each bullet is one sentence under 30 words, plain and specific, no hype.
Write every money amount in Indian rupees using crore or lakh, never in dollars.
Return JSON: {"bullets": [string, string, string, string]}`;

// Today's summary: read from the database, or written by Gemini once and saved
export async function todaysSummary(news) {
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [saved] = await sql`SELECT bullets FROM pulse WHERE day = ${day}`;
  if (saved) return JSON.parse(saved.bullets);
  if (!news.length) return [];
  try {
    const list = news.slice(0, 50).map((n, i) => `[${i}] ${n.title} (${n.source})`).join('\n');
    const out = await gemini({ system: SUMMARY_SYSTEM, prompt: list, fast: true, temperature: 0.3, deadline: Date.now() + 30000 });
    const bullets = (out?.bullets || []).filter((b) => typeof b === 'string' && b.trim()).slice(0, 5);
    if (bullets.length) {
      await sql`INSERT INTO pulse (day, bullets) VALUES (${day}, ${JSON.stringify(bullets)}) ON CONFLICT (day) DO NOTHING`;
    }
    return bullets;
  } catch {
    return []; // the page still works without the summary
  }
}

// Funding numbers for the last 30 days, counted ONLY from startups that fit the thesis
export async function fundingStats(usdInr) {
  const rows = await sql`
    SELECT s.amount, s.sector, s.round_type, s.status
    FROM startups s
    WHERE s.status IN ('fit', 'drafted', 'sent', 'skipped')
      AND (s.announced_at >= now() - interval '30 days' OR s.announced_at IS NULL)`;
  let total = 0;
  const sectors = new Map();
  for (const r of rows) {
    const inr = amountToInr(r.amount, usdInr);
    if (inr) total += inr;
    const sector = (r.sector || 'Other').split(/[/,]/)[0].trim() || 'Other';
    sectors.set(sector, (sectors.get(sector) || 0) + 1);
  }
  return {
    fits: rows.length,
    raised: total ? formatInr(total) : '₹0',
    sent: rows.filter((r) => r.status === 'sent').length,
    topSectors: [...sectors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
  };
}

// Good fits that left the folder after the outreach window without an email
export async function missedRounds() {
  return sql`
    SELECT s.name, s.round_type, s.amount, s.fit_score, s.announced_at, s.source_url, s.source_name, d.domain
    FROM drafts d JOIN startups s ON s.id = d.startup_id
    WHERE d.status = 'archived'
    ORDER BY s.announced_at DESC
    LIMIT 12`;
}

// New headlines about startups Rohit has drafted for or emailed: are they doing well?
export async function trackedInNews(news) {
  const tracked = await sql`
    SELECT s.name, d.status, d.domain
    FROM drafts d JOIN startups s ON s.id = d.startup_id
    WHERE d.status IN ('draft', 'sent', 'archived')`;
  const out = [];
  for (const t of tracked) {
    const name = t.name.toLowerCase();
    if (name.length < 4) continue;
    const hits = news.filter((n) => n.title.toLowerCase().includes(name)).slice(0, 3);
    out.push({ name: t.name, status: t.status, domain: t.domain, hits });
  }
  // Startups with news first
  return out.sort((a, b) => b.hits.length - a.hits.length);
}

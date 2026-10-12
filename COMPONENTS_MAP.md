# FreshRaise: Components Map

Every morning, FreshRaise finds Indian and Indian-founded startups that announced a pre-seed, seed or angel round in
the last day, scores each one against the accelerator's thesis, researches the ones that fit, and leaves an outreach
email ready for Rohit to approve. Startups that don't fit are never shown. No startup is ever drafted twice.

**Live:** https://freshraise.vercel.app · **Code:** https://github.com/Rashmi-0704/freshraise

## Component map

| Step | Component | Tool | What it does | Status |
|---|---|---|---|---|
| Trigger | Daily run | **Vercel Cron** (`vercel.json`, `app/api/cron/route.js`) | Runs the pipeline at 00:30 UTC (6:00 am IST), protected by `CRON_SECRET` | ✅ Registered |
| Trigger (manual) | "Check for new rounds" button | Next.js server action (`app/actions.js`) | Same pipeline, on demand | ✅ Live |
| Input | Live news | 10 free RSS feeds (`lib/feeds.js`): 5 Google News searches, Inc42, Entrackr, ET Startups, YourStory, TechCrunch | Pulls about 190 articles in parallel, no API keys | ✅ All 10 working |
| Processing | Filter | `lib/pipeline.js` | Keeps the last 26 hours, funding-looking titles, no Series B+, never-seen URLs; up to 100 articles | ✅ |
| AI | Screen | **Gemini Flash** (`gemini-3.8-flash`, `lib/gemini.js`) | Picks real pre-seed / seed / angel rounds with an Indian link, in one request | ✅ |
| Dedupe | Never twice | **Neon Postgres** | Startup name key is UNIQUE; a website can only ever have one draft | ✅ Tested (5 of 5 repeats blocked) |
| Context | Thesis | `thesis` table in Neon | Sectors, stages, geography, round size (₹), exclusions, minimum score; read fresh every run | ✅ Tested (65 → 90 changed results, no code edit) |
| AI | Score | **Gemini Flash** | Scores 0-100 with a fixed scale and a one-sentence reason; below the minimum is hidden | ✅ |
| AI | Research + draft | **Gemini Flash + Google Search** | Finds website, company background, founders with roles and backgrounds, then writes a short email | ✅ |
| Context | Rupees | **Frankfurter** (free, no key, ECB rates; `lib/money.js`) | Converts dollar amounts to ₹ crore / lakh at today's rate | ✅ |
| Storage | Everything | **Neon Postgres** (replaces Supabase, approved) | `thesis`, `articles`, `startups`, `drafts`, `runs` tables, created automatically | ✅ |
| Output | Morning Brief | Next.js 14 on **Vercel** (Singapore region) | Draft cards: round, ₹ amount, fit score, 60-day ring, company background, founders, editable email | ✅ |
| Output | Send | **Resend** (`lib/resend.js`) | Sends the approved email; test mode sends to our own inbox | ✅ Test email received |
| Code | Repo | **GitHub** (public) | Push to `main` → Vercel deploys | ✅ |

```
Vercel Cron (6 am IST) ─┐
                        ├─→ 10 RSS feeds → filter → Gemini: screen → Neon: dedupe ─┐
"Check" button ─────────┘                                                          │
                       ┌───────────────────────────────────────────────────────────┘
                       ↓
          Gemini: score vs thesis (Neon) ─┬─ below minimum → hidden, logged as rejected
                                          └─ fit → Gemini + Google Search: research + draft
                                                         ↓
                                Morning Brief (Vercel) → Rohit edits → Resend → founder
```

**Cost:** ₹0. Every tool runs on a free tier with no credit card: Gemini (AI Studio), Neon, Resend, Vercel Hobby,
GitHub, RSS feeds and Frankfurter.

## The 9 reliability checks

Found while reviewing the code (Step 1) and fixed before deploying, so a run never stops halfway or contacts anyone twice.

| # | Check | What could go wrong | How it's handled | Where |
|---|---|---|---|---|
| 1 | Time limit | Vercel stops the function mid-run | Every Gemini call has a deadline; 300s function limit; the run stops itself 30s early and leftovers are drafted next run | `lib/gemini.js`, `lib/pipeline.js` |
| 2 | Gemini free-tier limits | 429 "too many requests" errors | Calls spaced to `GEMINI_RPM`; waits as long as Gemini asks; stops cleanly when the daily quota is used up | `lib/gemini.js` |
| 3 | Model changes | The old model is retired | Uses `gemini-3.8-flash`; drops the "thinking" setting automatically if a model rejects it | `lib/gemini.js` |
| 4 | Open cron endpoint | Strangers trigger runs and use up the quota | `/api/cron` refuses to run without `CRON_SECRET` | `app/api/cron/route.js` |
| 5 | Public site | Anyone can run, edit or send | Optional password with `APP_PASSWORD` (off by default) | `middleware.js` |
| 6 | Missed news | The cron fires late in its hour, articles slip between runs | 26-hour lookback; overlap is safe because seen URLs are skipped | `lib/pipeline.js` |
| 7 | Double or stuck sends | A double click or crash sends twice or leaves a draft stuck | Lock before sending, released after 5 minutes if it crashed; Resend idempotency key | `app/actions.js`, `lib/resend.js` |
| 8 | Same startup, two names | "Krishi Labs" and "KrishiLabs AI" both get drafts | Normalised name key, plus one draft per website domain | `lib/util.js`, `lib/db.js` |
| 9 | Killed or overlapping runs | A killed run blocks the next; two runs overlap | Stale runs closed after 10 minutes; only one run at a time | `lib/pipeline.js` |

Also fixed during live testing: Entrackr's feed moved (now `/rss`), Next.js was caching database reads (now `no-store`),
scores varied between runs (fixed scale, temperature 0), and the app moved to Singapore next to the database
(pages went from about 5s to under 1s).

## Hard rules: where they're enforced

| Rule | Where |
|---|---|
| Gemini Flash for every AI task, via Google AI Studio | `lib/gemini.js` is the only AI client; no other AI SDK in `package.json` |
| Live external data | 10 live RSS feeds (`lib/feeds.js`) and the live exchange rate (`lib/money.js`) |
| Deployed on Vercel with a public URL | https://freshraise.vercel.app |
| Neon Postgres database | `lib/db.js` (`@neondatabase/serverless`) |
| Emails via Resend | `lib/resend.js` |
| Free tiers only | See Cost above |
| Never draft the same startup twice | `startups.name_key` UNIQUE, `drafts.startup_id` UNIQUE, `drafts.domain` unique index |
| Non-fitting startups never shown | Only `drafts` with status `draft` are listed; rejected startups never get a draft |
| Thesis editable without code | `thesis` table (Thesis page or Neon SQL editor), read on every run |
| No keys in code | Everything comes from environment variables; `.env*` is gitignored |

## Startup status lifecycle

`new` → scored → `rejected` (hidden) **or** `fit` → `drafted` (or `duplicate` if the website already has a draft) → `sent` / `skipped`

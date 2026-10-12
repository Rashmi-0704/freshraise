# 🌱 FreshRaise

**Morning outreach drafts for freshly funded startups.** Every morning, FreshRaise reads the startup news, finds Indian
and Indian-founded startups that announced a pre-seed, seed or angel round in the last day, scores each one against
the accelerator's thesis, researches the ones that fit, and leaves a personalised outreach email ready to approve and send.

Startups that don't fit are never shown. No startup is ever drafted twice.

**Live:** https://freshraise.vercel.app · **Code:** https://github.com/Rashmi-0704/freshraise

See [COMPONENTS_MAP.md](./COMPONENTS_MAP.md) for the component map, the Nine Checks (does this deserve to be built?)
and where each rule is enforced.

## Stack (all free tiers, ₹0)

| Part | Tool |
|---|---|
| AI | Gemini Flash (`gemini-3.8-flash`) via Google AI Studio, REST API |
| Database | Neon Postgres (used in place of Supabase, approved by instructor) |
| Email | Resend |
| Hosting + daily schedule | Vercel Hobby (Singapore region) + Vercel Cron |
| News | 10 RSS feeds, no keys: 5 Google News searches, Inc42, Entrackr, ET Startups, YourStory, TechCrunch |
| Exchange rate | Frankfurter (European Central Bank rates, no key) |
| App | Next.js 14 App Router, plain JavaScript and CSS |

## How it works

1. **Listen.** At 6:00 am IST (or when Rohit clicks **Check for new rounds**), pulls 10 live RSS feeds in parallel.
2. **Filter.** Keeps articles from the last 24 hours that look like funding news and haven't been seen before.
3. **Screen.** Gemini picks out real pre-seed / seed / angel rounds by Indian or Indian-founded startups.
4. **Dedupe.** Each startup gets a normalised name key that is unique in the database. Already seen means skipped.
5. **Score.** Gemini scores each startup 0 to 100 against the `thesis` table, read fresh every run. Below the minimum, it's hidden.
6. **Research and draft.** Gemini, grounded with Google Search, finds the website, company background and each founder's
   role and background, then writes the email. A website can only ever have one draft.
7. **Morning email.** After the 6 am run, Rohit gets a short email listing the drafts waiting (or a warning if the run failed).
8. **Approve.** Rohit opens the Morning Brief, reads the background, edits if needed, and clicks **Send email**. Resend delivers it.
9. **Measure.** When a founder replies, Rohit clicks **Mark replied**. The brief shows sent → replied (%).

All amounts are shown in rupees (₹ crore / lakh). Dollar amounts are converted at the day's exchange rate.

## Using it

- **Morning Brief** (`/`): one card per startup that fits. Closed, a card shows the round, amount in ₹, fit score, a
  one-line description, and a ring counting down the 60-day outreach window. Open it to see the company background,
  the founders you're writing to, and the editable email.
- **Sent so far** (on the Morning Brief): every email sent, a **Mark replied** button, and the reply rate.
- **Thesis** (`/thesis`): sectors, stages, geography, round size, exclusions, minimum fit score and program pitch.
  **Re-score with this thesis** applies a changed thesis to the startups already waiting: drafts that no longer fit
  are hidden (not deleted), and come back if a later thesis fits them again.

### Changing the thesis without touching code

Use the Thesis page, or edit the row in Neon's SQL editor:

```sql
UPDATE thesis SET min_fit_score = 90, updated_at = now() WHERE id = 1;
```

The next run scores new startups against it. To re-score the ones already waiting, click **Re-score with this thesis** on the Thesis page.

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, GEMINI_API_KEY, RESEND_API_KEY, RESEND_TEST_TO, CRON_SECRET
npm run dev                  # open http://localhost:3000
```

Tables are created automatically on first load.

**Where the keys come from**
- `DATABASE_URL`: neon.tech → project → **Connect** → connection string
- `GEMINI_API_KEY`: aistudio.google.com → **Get API key**
- `RESEND_API_KEY`: resend.com → **API Keys**
- `CRON_SECRET`: any long random string

## Deploy (Vercel)

1. Push to GitHub, then in Vercel: **Add New → Project →** import the repo.
2. **Settings → Environment Variables:** add everything from `.env.example`.
3. Deploy. The daily cron from `vercel.json` appears under **Settings → Cron Jobs**. On the Hobby plan Vercel may run
   it any time within that hour.

Functions run in `sin1` (Singapore) next to the Neon database, with a 300-second limit (Fluid Compute, on by default).

## Test mode

Without a verified domain, Resend only delivers to your own signup address. Set `RESEND_TEST_TO` to that address and
every approved email goes to you, with the founder's address in the subject line. Verify a domain in Resend and
remove `RESEND_TEST_TO` to send to founders directly.

## Tuning

| Variable | Default | Meaning |
|---|---|---|
| `GEMINI_MODEL` | gemini-3.8-flash | Any Gemini Flash model your key can use |
| `GEMINI_SEARCH` | true | Research with Google Search before drafting |
| `GEMINI_RPM` | 10 | Max Gemini requests per minute (match your free-tier limit) |
| `LOOKBACK_HOURS` | 24 | How far back to look. Try 168 (7 days) on a quiet news week |
| `MAX_ARTICLES_PER_RUN` | 100 | Articles sent to Gemini for screening per run |
| `MAX_DRAFTS_PER_RUN` | 10 | Drafts written per run (leftovers are drafted next run) |
| `TIME_BUDGET_MS` | 270000 | How long a run works before stopping, 30s under the 300s limit |
| `APP_PASSWORD` | empty | If set, the site asks for this password (any username) |
| `DIGEST_TO` | `RESEND_TEST_TO` | Where the 6 am summary email goes |
| `USD_INR` | 96 | Backup exchange rate if Frankfurter is unreachable |

## What changed from the starting code

- **Renamed** Golden Hour → FreshRaise, with startup doodles (rocket, paper planes, a funding-stage garden), round
  badges and an empty-state illustration, keeping the dawn-sky palette and fonts.
- **Company background:** each draft shows what the company does, when and where it started, and each founder's role
  and background.
- **Rupees:** every amount is shown in ₹ crore / lakh.
- **Morning email** to Rohit after the 6 am run, **Mark replied** with a reply rate, and **Re-score with this thesis**.
- **24-hour window** for announcements, as in the brief.
- **Gemini model** updated to `gemini-3.8-flash` (2.5 Flash is retired for new keys).
- **Feeds:** Entrackr's feed moved to `/rss`; added ET Startups.
- **Reliability safeguards** (below): time limits, rate limits, cron lock, duplicate guards and more.
- **Fixes found in live testing:** database reads were cached by Next.js, scores varied between runs, pages were slow
  until the app moved to Singapore.

## Reliability safeguards

Found while reviewing the starting code and fixed before deploying, so a run never stops halfway or contacts anyone twice.

| Risk | How it's handled | Where |
|---|---|---|
| Vercel stops the function mid-run | Every Gemini call has a deadline; 300s limit; the run stops itself 30s early and leftovers are drafted next run | `lib/gemini.js`, `lib/pipeline.js` |
| Gemini free-tier 429 errors | Calls spaced to `GEMINI_RPM`; waits as long as Gemini asks; stops cleanly when the daily quota is used up | `lib/gemini.js` |
| The Gemini model is retired | Uses `gemini-3.8-flash`; drops the "thinking" setting if a model rejects it | `lib/gemini.js` |
| Strangers trigger the cron | `/api/cron` refuses to run without `CRON_SECRET` | `app/api/cron/route.js` |
| Anyone can use the public site | Optional password with `APP_PASSWORD` | `middleware.js` |
| A quiet news day | Raise `LOOKBACK_HOURS` (e.g. 48); seen URLs are skipped, so overlap is always safe | `lib/pipeline.js` |
| Double or stuck sends | Lock before sending (released after 5 minutes if a send crashed); Resend idempotency key | `app/actions.js`, `lib/resend.js` |
| Same startup under two names | Normalised name key, plus one draft per website domain | `lib/util.js`, `lib/db.js` |
| Killed or overlapping runs | Stale runs closed after 10 minutes; only one run at a time | `lib/pipeline.js` |

Also fixed during live testing: Entrackr's feed moved (now `/rss`), Next.js was caching database reads (now
`no-store`), scores varied between runs (fixed scale, temperature 0), and the app moved to Singapore next to the
database (pages went from about 5s to under 1s).

## Troubleshooting

- **"DATABASE_URL is not set"**: add the env var in Vercel and redeploy.
- **"Gemini free-tier daily limit reached"**: the quota resets the next day; leftovers are drafted on the next run.
- **No drafts after a check**: the day may be quiet. Set `LOOKBACK_HOURS=168` or lower the minimum fit score.
- **"A check is already running"**: wait a minute; only one run happens at a time.
- **Resend error about recipients**: set `RESEND_TEST_TO` to your Resend signup email.

## Known limits

- News reports the **round size**, not the company's valuation (rarely public at seed stage), so FreshRaise shows the round amount.
- Next.js 14.2.35 is the last 14.x release. `npm audit` lists advisories fixed only in Next.js 16; the ones that apply
  to other setups (Windows hosting, image optimisation, rewrites) aren't used here. Upgrading is a follow-up.

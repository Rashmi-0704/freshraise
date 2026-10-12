# 🌅 FreshRaise

**Timed funding outreach for accelerators.** Every morning, FreshRaise reads the startup news, finds Indian
and Indian-founded startups that announced a pre-seed, seed or angel round in the last 24 hours, scores each
one against your accelerator's thesis, researches the ones that fit, and leaves a personalised outreach email
ready to approve and send.

Startups that don't fit are never shown. No startup is ever drafted twice.

## Stack (all free tiers)

| Part | Tool |
|---|---|
| AI | Gemini Flash (Google AI Studio) |
| Database | Neon Postgres (used in place of Supabase, approved by instructor) |
| Email | Resend |
| Hosting + daily schedule | Vercel (Hobby) + Vercel Cron |
| News | Google News RSS, Inc42, Entrackr, YourStory, TechCrunch (no keys) |

See [COMPONENTS_MAP.md](./COMPONENTS_MAP.md) for the architecture diagram.

## How it works

1. **Listen.** Pulls 9 live RSS feeds in parallel.
2. **Filter.** Keeps articles from the last 24 hours that look like funding news and haven't been seen before.
3. **Screen.** Gemini picks out real pre-seed / seed / angel announcements by Indian or Indian-founded startups.
4. **Dedupe.** Each startup gets a normalised name key that is unique in the database. Already seen means skipped.
5. **Score.** Gemini scores each startup 0 to 100 against the `thesis` table, read fresh every run.
   Below the minimum score, it's hidden.
6. **Research and draft.** Gemini, grounded with Google Search, finds the founders and product details and writes
   the email.
7. **Approve.** Rohit opens the Morning Brief, edits if needed, and clicks Send email. Resend delivers it.

## Setup (about 15 minutes)

### 1. Get your keys
- **Neon:** create a project at neon.tech, then Connect, copy the connection string.
- **Gemini:** aistudio.google.com, Get API key.
- **Resend:** resend.com, API Keys, create one.

### 2. Run locally (optional)
```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev                  # open http://localhost:3000
```
Tables are created automatically on first load. Click **Check for new rounds** to run the pipeline.

### 3. Deploy to Vercel
1. Push this folder to a GitHub repo.
2. In Vercel: Add New, Project, import the repo.
3. In Environment Variables, add everything from `.env.example`.
4. Deploy. Open the URL and click **Check for new rounds**.

The daily cron in `vercel.json` runs at 00:30 UTC (6:00 am IST). On the Hobby plan, Vercel may run it
any time within that hour.

## Changing the thesis without touching code

Either use the **Thesis** page, or edit the row in Neon's SQL editor:

```sql
UPDATE thesis SET sectors = 'AI, climate tech', min_fit_score = 70, updated_at = now() WHERE id = 1;
```

The next run scores against the new thesis.

## About test mode

On Resend's free plan without a verified domain, emails can only be delivered to your own signup address.
Set `RESEND_TEST_TO` to that address and every approved email goes to you, with the founder's address in the
subject line. Verify a domain in Resend and remove `RESEND_TEST_TO` to send to founders directly.

## Tuning

| Variable | Default | Meaning |
|---|---|---|
| `LOOKBACK_HOURS` | 24 | How far back to look for announcements. Try 48 on a quiet news day. |
| `MAX_ARTICLES_PER_RUN` | 60 | Articles sent to Gemini for screening per run |
| `MAX_DRAFTS_PER_RUN` | 6 | Drafts written per run (leftovers are drafted next run) |
| `GEMINI_MODEL` | gemini-3.8-flash | Any Gemini Flash model in AI Studio |
| `GEMINI_SEARCH` | true | Research with Google Search before drafting |

## Troubleshooting

- **"DATABASE_URL is not set"**: add the env var in Vercel and redeploy.
- **Gemini 429 errors**: free-tier rate limit. Lower `MAX_DRAFTS_PER_RUN` to 3; leftovers are drafted next run.
- **No drafts after a check**: the day may be quiet. Set `LOOKBACK_HOURS=48` or lower the minimum fit score.
- **Resend error about recipients**: set `RESEND_TEST_TO` to your Resend signup email.

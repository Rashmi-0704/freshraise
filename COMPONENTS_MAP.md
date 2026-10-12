# FreshRaise: Components Map

```mermaid
flowchart LR
    subgraph Sources["Live news (free, no keys)"]
        GN["Google News RSS<br/>5 funding searches"]
        IN["Inc42 / Entrackr / YourStory"]
        TC["TechCrunch"]
    end

    CRON["Vercel Cron<br/>daily, 6:00 am IST"] --> PIPE
    BTN["'Check for new rounds'<br/>button"] --> PIPE

    Sources --> PIPE["Pipeline<br/>lib/pipeline.js"]

    PIPE -->|"1. screen articles"| G1["Gemini Flash<br/>classify seed / pre-seed / angel"]
    PIPE -->|"2. score fit"| G2["Gemini Flash<br/>score vs thesis"]
    PIPE -->|"3. research + write"| G3["Gemini Flash + Google Search<br/>personalised draft"]

    PIPE <-->|"read thesis, dedupe,<br/>save drafts"| DB[("Neon Postgres<br/>thesis, articles, startups,<br/>drafts, runs")]

    DB --> UI["Morning Brief<br/>(Next.js on Vercel)"]
    TH["Thesis page"] -->|"update thesis"| DB
    UI -->|"Send email"| RS["Resend"] --> F["Founder's inbox"]
    RS -->|"mark contacted"| DB
```

| Component | Tool | What it does |
|---|---|---|
| News sources | Google News RSS, Inc42, Entrackr, YourStory, TechCrunch | Live funding announcements, no API key |
| Scheduler | Vercel Cron (`vercel.json`) | Runs the pipeline every morning |
| Pipeline | `lib/pipeline.js` | Fetch, filter last 24h, dedupe, score, draft |
| AI | Gemini Flash (`lib/gemini.js`) | Classifies articles, scores fit, researches and writes emails |
| Database | Neon Postgres (`lib/db.js`) | Thesis, seen articles, startups, drafts, run history |
| Duplicate guard | `startups.name_key` UNIQUE + `articles.url` PK | A startup can only ever get one draft |
| Configurable thesis | `thesis` table | Read fresh on every run, so edits apply with no code change |
| Email sending | Resend (`lib/resend.js`) | Sends approved drafts |
| Interface | Next.js App Router | Morning Brief (drafts) and Thesis pages |

## Startup status lifecycle

`new` → scored → `rejected` (hidden from Rohit) **or** `fit` → `drafted` → `sent` / `skipped`

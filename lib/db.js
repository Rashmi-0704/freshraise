import { neon } from '@neondatabase/serverless';

let client;

// Tagged-template SQL helper. Connects lazily so builds work without env vars.
export function sql(strings, ...values) {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set. Add your Neon connection string in Vercel > Settings > Environment Variables.');
    }
    // no-store: Next.js must never cache database answers, or duplicate checks could read stale data
    client = neon(process.env.DATABASE_URL, { fetchOptions: { cache: 'no-store' } });
  }
  return client(strings, ...values);
}

let schemaPromise;

// Creates every table on first use, so there is no manual migration step.
export function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = createSchema().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

async function createSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS thesis (
      id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      accelerator_name TEXT NOT NULL DEFAULT 'Launchpad Accelerator',
      sender_name TEXT NOT NULL DEFAULT 'Rohit',
      sender_title TEXT NOT NULL DEFAULT 'Program Recruitment Lead',
      program_pitch TEXT NOT NULL DEFAULT 'A 12-week program for freshly funded founders: hands-on GTM support, mentor office hours with operators who have scaled in India and the US, cloud and tooling credits, and a demo day in front of Series A investors.',
      sectors TEXT NOT NULL DEFAULT 'B2B SaaS, AI and ML, fintech, developer tools, climate tech, healthtech',
      stages TEXT NOT NULL DEFAULT 'Pre-seed, Seed, Angel',
      geography TEXT NOT NULL DEFAULT 'Startups based in India, and startups with Indian founders based anywhere in the world',
      round_size TEXT NOT NULL DEFAULT 'Rounds between ₹80 lakh and ₹25 crore',
      exclusions TEXT NOT NULL DEFAULT 'Crypto tokens, gambling, pure services or agencies, D2C consumer brands without proprietary tech',
      min_fit_score INT NOT NULL DEFAULT 65,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`INSERT INTO thesis (id) VALUES (1) ON CONFLICT (id) DO NOTHING`;
  // Older databases got the round size in dollars; switch it to rupees only if nobody has edited it
  await sql`
    UPDATE thesis SET round_size = 'Rounds between ₹80 lakh and ₹25 crore'
    WHERE round_size = 'Rounds between $100K and $3M (roughly Rs 80 lakh to Rs 25 crore)'`;

  await sql`
    CREATE TABLE IF NOT EXISTS articles (
      url TEXT PRIMARY KEY,
      title TEXT,
      source TEXT,
      published_at TIMESTAMPTZ,
      seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS startups (
      id SERIAL PRIMARY KEY,
      name_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      sector TEXT,
      location TEXT,
      round_type TEXT,
      amount TEXT,
      investors TEXT,
      indian_link TEXT,
      one_liner TEXT,
      announced_at TIMESTAMPTZ,
      source_url TEXT,
      source_title TEXT,
      source_name TEXT,
      fit_score INT,
      fit_reason TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS drafts (
      id SERIAL PRIMARY KEY,
      startup_id INT UNIQUE NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
      to_email TEXT,
      founders TEXT,
      website TEXT,
      domain TEXT,
      research_notes TEXT,
      about TEXT,
      founded TEXT,
      hq TEXT,
      founder_bios TEXT,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      resend_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      sending_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ
    )`;
  // For databases created before these columns existed
  await sql`ALTER TABLE drafts ADD COLUMN IF NOT EXISTS domain TEXT`;
  await sql`ALTER TABLE drafts ADD COLUMN IF NOT EXISTS sending_at TIMESTAMPTZ`;
  // Company background from the research step (founder_bios is a JSON list of {name, role, background})
  await sql`ALTER TABLE drafts ADD COLUMN IF NOT EXISTS about TEXT`;
  await sql`ALTER TABLE drafts ADD COLUMN IF NOT EXISTS founded TEXT`;
  await sql`ALTER TABLE drafts ADD COLUMN IF NOT EXISTS hq TEXT`;
  await sql`ALTER TABLE drafts ADD COLUMN IF NOT EXISTS founder_bios TEXT`;
  // One draft per website, ever (blank websites are allowed to repeat)
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS drafts_domain_key ON drafts (domain) WHERE domain <> ''`;

  await sql`
    CREATE TABLE IF NOT EXISTS runs (
      id SERIAL PRIMARY KEY,
      trigger TEXT,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      finished_at TIMESTAMPTZ,
      articles_scanned INT NOT NULL DEFAULT 0,
      new_articles INT NOT NULL DEFAULT 0,
      fundings_found INT NOT NULL DEFAULT 0,
      duplicates INT NOT NULL DEFAULT 0,
      rejected INT NOT NULL DEFAULT 0,
      drafted INT NOT NULL DEFAULT 0,
      sources_ok TEXT,
      error TEXT
    )`;
}

// Read fresh on every run, so edits in Neon apply to the next scoring with no code change.
export async function getThesis() {
  const rows = await sql`SELECT * FROM thesis WHERE id = 1`;
  return rows[0];
}

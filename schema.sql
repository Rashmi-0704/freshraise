-- For reference only. The app creates these tables automatically on first load.
-- To change the thesis directly in Neon's SQL editor, for example:
--   UPDATE thesis SET sectors = 'AI, climate tech', min_fit_score = 70, updated_at = now() WHERE id = 1;

CREATE TABLE IF NOT EXISTS thesis (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  accelerator_name TEXT NOT NULL, sender_name TEXT NOT NULL, sender_title TEXT NOT NULL,
  program_pitch TEXT NOT NULL, sectors TEXT NOT NULL, stages TEXT NOT NULL, geography TEXT NOT NULL,
  round_size TEXT NOT NULL, exclusions TEXT NOT NULL, min_fit_score INT NOT NULL DEFAULT 65,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS articles (url TEXT PRIMARY KEY, title TEXT, source TEXT, published_at TIMESTAMPTZ, seen_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS startups (
  id SERIAL PRIMARY KEY, name_key TEXT UNIQUE NOT NULL, name TEXT NOT NULL, sector TEXT, location TEXT,
  round_type TEXT, amount TEXT, investors TEXT, indian_link TEXT, one_liner TEXT, announced_at TIMESTAMPTZ,
  source_url TEXT, source_title TEXT, source_name TEXT, fit_score INT, fit_reason TEXT,
  status TEXT NOT NULL DEFAULT 'new', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS drafts (
  id SERIAL PRIMARY KEY, startup_id INT UNIQUE NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  to_email TEXT, founders TEXT, website TEXT, domain TEXT, research_notes TEXT, subject TEXT NOT NULL, body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', resend_id TEXT, created_at TIMESTAMPTZ DEFAULT now(),
  sending_at TIMESTAMPTZ, sent_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS drafts_domain_key ON drafts (domain) WHERE domain <> '';
CREATE TABLE IF NOT EXISTS runs (
  id SERIAL PRIMARY KEY, trigger TEXT, started_at TIMESTAMPTZ DEFAULT now(), finished_at TIMESTAMPTZ,
  articles_scanned INT DEFAULT 0, new_articles INT DEFAULT 0, fundings_found INT DEFAULT 0, duplicates INT DEFAULT 0,
  rejected INT DEFAULT 0, drafted INT DEFAULT 0, sources_ok TEXT, error TEXT
);

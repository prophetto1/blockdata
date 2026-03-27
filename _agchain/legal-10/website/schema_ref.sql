-- LegalChain.run Core Schema (Supabase / Postgres)
-- THIS IS FOR ONLY ONE RUN TYPE - DIFFERENT SCHEMA DEF FOR EACH RUN TYPE
-- Design goals:
-- - Public leaderboard without leaking draft runs
-- - Leaderboard semantics defined in SQL (auditable view)
-- - Static site can read directly via anon key + RLS

-- Extensions (required for gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Models Registry
CREATE TABLE IF NOT EXISTS models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    api_model_id TEXT,
    parameters TEXT,
    context_window TEXT,
    quantization TEXT,
    release_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT models_name_provider_unique UNIQUE (name, provider)
);

-- 2) Benchmark Runs
CREATE TABLE IF NOT EXISTS runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    benchmark_version TEXT NOT NULL,
    dataset_version TEXT NOT NULL,
    spec_hash TEXT NOT NULL,
    langfuse_trace_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, published, archived
    published_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) Aggregated Run Scores (1 row per run)
CREATE TABLE IF NOT EXISTS run_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
    s1 DOUBLE PRECISION,
    s3_consistency DOUBLE PRECISION,
    s4_disposition DOUBLE PRECISION,
    s5_cb DOUBLE PRECISION,
    s5_rag DOUBLE PRECISION,
    s6 DOUBLE PRECISION,
    s7 DOUBLE PRECISION,
    s8_pass_rate DOUBLE PRECISION,
    chain_score DOUBLE PRECISION NOT NULL,
    voided BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4) Editorial Reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL, -- Markdown
    status TEXT NOT NULL DEFAULT 'draft', -- draft, review, published
    author_id UUID,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure expected constraints exist (safe to re-run)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'models_name_key'
          AND conrelid = 'public.models'::regclass
    ) THEN
        ALTER TABLE models DROP CONSTRAINT models_name_key;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'models_name_provider_unique'
          AND conrelid = 'public.models'::regclass
    ) THEN
        ALTER TABLE models
            ADD CONSTRAINT models_name_provider_unique UNIQUE (name, provider);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_attribute a
            ON a.attrelid = c.conrelid
           AND a.attnum = ANY (c.conkey)
        WHERE c.conrelid = 'public.run_scores'::regclass
          AND c.contype = 'u'
          AND array_length(c.conkey, 1) = 1
          AND a.attname = 'run_id'
    ) THEN
        ALTER TABLE run_scores
            ADD CONSTRAINT run_scores_run_id_unique UNIQUE (run_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'runs_status_check'
          AND conrelid = 'public.runs'::regclass
    ) THEN
        ALTER TABLE runs
            ADD CONSTRAINT runs_status_check CHECK (status IN ('draft', 'published', 'archived'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'reports_status_check'
          AND conrelid = 'public.reports'::regclass
    ) THEN
        ALTER TABLE reports
            ADD CONSTRAINT reports_status_check CHECK (status IN ('draft', 'review', 'published'));
    END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS runs_model_created_idx ON runs (model_id, created_at DESC);
CREATE INDEX IF NOT EXISTS runs_created_idx ON runs (created_at DESC);
CREATE INDEX IF NOT EXISTS reports_status_published_idx ON reports (status, published_at DESC);

-- Enable RLS
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Public Read Policies (read-only; writes require service role or explicit admin policies)
DROP POLICY IF EXISTS "Public read access for models" ON models;
DROP POLICY IF EXISTS "Public read access for runs" ON runs;
DROP POLICY IF EXISTS "Public read access for run_scores" ON run_scores;
DROP POLICY IF EXISTS "Public read access for published runs" ON runs;
DROP POLICY IF EXISTS "Public read access for published run_scores" ON run_scores;
DROP POLICY IF EXISTS "Public read access for published reports" ON reports;

CREATE POLICY "Public read access for models" ON models
  FOR SELECT USING (true);

CREATE POLICY "Public read access for published runs" ON runs
  FOR SELECT USING (status = 'published');

CREATE POLICY "Public read access for published run_scores" ON run_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM runs r
      WHERE r.id = run_scores.run_id
        AND r.status = 'published'
    )
  );

CREATE POLICY "Public read access for published reports" ON reports
  FOR SELECT USING (status = 'published');

-- Leaderboard definition (1 row per model per benchmark+dataset)
CREATE OR REPLACE VIEW public_leaderboard_latest_v1 AS
SELECT DISTINCT ON (r.model_id, r.benchmark_version, r.dataset_version)
  r.id AS run_uuid,
  r.created_at,
  r.benchmark_version,
  r.dataset_version,
  r.spec_hash,
  r.langfuse_trace_id,
  m.id AS model_uuid,
  m.name AS model,
  m.provider,
  m.api_model_id AS model_id,
  m.parameters,
  m.context_window,
  m.quantization,
  m.release_date,
  rs.s1,
  rs.s3_consistency,
  rs.s4_disposition,
  rs.s5_cb,
  rs.s5_rag,
  rs.s6,
  rs.s7,
  rs.s8_pass_rate,
  rs.chain_score AS chain,
  rs.voided,
  (
    COALESCE(rs.s1, 0) +
    COALESCE(rs.s3_consistency, 0) +
    COALESCE(rs.s4_disposition, 0) +
    COALESCE(rs.s5_cb, 0) +
    COALESCE(rs.s5_rag, 0) +
    COALESCE(rs.s6, 0) +
    COALESCE(rs.s7, 0) +
    COALESCE(rs.s8_pass_rate, 0)
  ) / NULLIF(
    (rs.s1 IS NOT NULL)::int +
    (rs.s3_consistency IS NOT NULL)::int +
    (rs.s4_disposition IS NOT NULL)::int +
    (rs.s5_cb IS NOT NULL)::int +
    (rs.s5_rag IS NOT NULL)::int +
    (rs.s6 IS NOT NULL)::int +
    (rs.s7 IS NOT NULL)::int +
    (rs.s8_pass_rate IS NOT NULL)::int,
    0
  ) AS avg_pass_rate,
  CASE
    WHEN (r.metadata->>'milestones_complete') ~ '^[0-9]+$' THEN (r.metadata->>'milestones_complete')::INT
    ELSE NULL
  END AS milestones_complete,
  CASE
    WHEN (r.metadata->>'milestones_total') ~ '^[0-9]+$' THEN (r.metadata->>'milestones_total')::INT
    ELSE NULL
  END AS milestones_total,
  CASE
    WHEN (r.metadata->>'avg_latency_ms') ~ '^[0-9]+(\\.[0-9]+)?$' THEN (r.metadata->>'avg_latency_ms')::DOUBLE PRECISION
    ELSE NULL
  END AS avg_latency_ms,
  CASE
    WHEN (r.metadata->>'cost_per_instance') ~ '^[0-9]+(\\.[0-9]+)?$' THEN (r.metadata->>'cost_per_instance')::DOUBLE PRECISION
    ELSE NULL
  END AS cost_per_instance
FROM runs r
JOIN models m ON m.id = r.model_id
JOIN run_scores rs ON rs.run_id = r.id
WHERE r.status = 'published'
ORDER BY r.model_id, r.benchmark_version, r.dataset_version, r.created_at DESC;


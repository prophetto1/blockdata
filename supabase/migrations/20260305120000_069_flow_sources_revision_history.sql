-- Migration 069: Restructure flow_sources from 1:1 (project_id PK) to
-- multi-flow revision history (flow_source_id PK, many rows per project).

-- 1. Add new columns
ALTER TABLE public.flow_sources
  ADD COLUMN IF NOT EXISTS flow_source_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS flow_id TEXT,
  ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS labels JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Backfill flow_id for any existing rows
UPDATE public.flow_sources SET flow_id = 'default' WHERE flow_id IS NULL;

-- 3. Make flow_id NOT NULL now that it's backfilled
ALTER TABLE public.flow_sources ALTER COLUMN flow_id SET NOT NULL;

-- 4. Backfill flow_source_id for any existing rows missing it
UPDATE public.flow_sources SET flow_source_id = gen_random_uuid() WHERE flow_source_id IS NULL;

-- 5. Drop the old project_id primary key
ALTER TABLE public.flow_sources DROP CONSTRAINT IF EXISTS flow_sources_pkey;

-- 6. Set flow_source_id as new primary key
ALTER TABLE public.flow_sources ALTER COLUMN flow_source_id SET NOT NULL;
ALTER TABLE public.flow_sources ADD PRIMARY KEY (flow_source_id);

-- 7. Unique constraint: one revision number per flow within a project
ALTER TABLE public.flow_sources
  ADD CONSTRAINT flow_sources_project_flow_revision_uq
  UNIQUE (project_id, flow_id, revision);

-- 8. Index for RevisionsTab query: WHERE project_id = ? ORDER BY revision DESC
CREATE INDEX IF NOT EXISTS idx_flow_sources_project_flow_rev
  ON public.flow_sources (project_id, flow_id, revision DESC);

-- 9. Service role full access (missing from original migration)
DROP POLICY IF EXISTS flow_sources_service_role ON public.flow_sources;
CREATE POLICY flow_sources_service_role
  ON public.flow_sources
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Migration 049: persist flow source and revision metadata for Kestra-style edit parity.

CREATE TABLE IF NOT EXISTS public.flow_sources (
  project_id UUID PRIMARY KEY
    REFERENCES public.projects(project_id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_flow_sources_updated_at'
  ) THEN
    CREATE TRIGGER set_flow_sources_updated_at
    BEFORE UPDATE ON public.flow_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.flow_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS flow_sources_select_own ON public.flow_sources;
CREATE POLICY flow_sources_select_own
  ON public.flow_sources
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.project_id = flow_sources.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS flow_sources_insert_own ON public.flow_sources;
CREATE POLICY flow_sources_insert_own
  ON public.flow_sources
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.project_id = flow_sources.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS flow_sources_update_own ON public.flow_sources;
CREATE POLICY flow_sources_update_own
  ON public.flow_sources
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.project_id = flow_sources.project_id
        AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.project_id = flow_sources.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS flow_sources_delete_own ON public.flow_sources;
CREATE POLICY flow_sources_delete_own
  ON public.flow_sources
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.project_id = flow_sources.project_id
        AND p.owner_id = auth.uid()
    )
  );

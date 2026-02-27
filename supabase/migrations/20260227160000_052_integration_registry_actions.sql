-- Migration 052: integration registry - separate by action
-- Purpose:
-- - Add an explicit "action" dimension (load/transform/parse/convert/export/etc.)
-- - Allow UI to tabulate primarily by action, while still preserving service_type (dlt/dbt/docling...)
-- - Make integration_services unique per (owner_id, project_id, action) so each action has one configured runtime.

-- ---------------------------------------------------------------------------
-- 1. integration_actions lookup
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integration_actions (
  action TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.integration_actions IS
  'Lookup table for integration actions (load/transform/parse/convert/etc.) used to tabulate registry UI.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_integration_actions_updated_at'
  ) THEN
    CREATE TRIGGER set_integration_actions_updated_at
    BEFORE UPDATE ON public.integration_actions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.integration_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS integration_actions_select
  ON public.integration_actions;
CREATE POLICY integration_actions_select
  ON public.integration_actions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS integration_actions_service_role
  ON public.integration_actions;
CREATE POLICY integration_actions_service_role
  ON public.integration_actions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.integration_actions FROM anon, authenticated;
GRANT SELECT ON TABLE public.integration_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.integration_actions TO service_role;

INSERT INTO public.integration_actions (action, display_name, description)
VALUES
  ('load', 'Load', 'Load/ingest structured data into destinations.'),
  ('transform', 'Transform', 'Transform loaded data (SQL/Python transforms).'),
  ('parse', 'Parse', 'Parse documents into structured representations.'),
  ('convert', 'Convert', 'Convert documents between formats / representations.'),
  ('export', 'Export', 'Export artifacts and results to external targets.')
ON CONFLICT (action) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2. integration_services: add action and re-key uniqueness
-- ---------------------------------------------------------------------------
ALTER TABLE public.integration_services
  ADD COLUMN IF NOT EXISTS action TEXT;

-- Backfill from service_type for existing rows.
UPDATE public.integration_services
SET action = CASE service_type
  WHEN 'dlt' THEN 'load'
  WHEN 'dbt' THEN 'transform'
  WHEN 'docling' THEN 'parse'
  ELSE NULL
END
WHERE action IS NULL;

ALTER TABLE public.integration_services
  ADD CONSTRAINT IF NOT EXISTS integration_services_action_fkey
  FOREIGN KEY (action) REFERENCES public.integration_actions(action) ON DELETE RESTRICT;

-- Make action required (after backfill).
ALTER TABLE public.integration_services
  ALTER COLUMN action SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.integration_services'::regclass
      AND conname = 'integration_services_unique_owner_project_type'
  ) THEN
    ALTER TABLE public.integration_services
      DROP CONSTRAINT integration_services_unique_owner_project_type;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.integration_services'::regclass
      AND conname = 'integration_services_unique_owner_project_action'
  ) THEN
    ALTER TABLE public.integration_services
      ADD CONSTRAINT integration_services_unique_owner_project_action
      UNIQUE (owner_id, project_id, action);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_integration_services_owner_project_action
  ON public.integration_services(owner_id, project_id, action);

COMMENT ON COLUMN public.integration_services.action IS
  'Primary action category for this configured runtime (load/transform/parse/convert/export).';

-- ---------------------------------------------------------------------------
-- 3. integration_functions: add action and align uniqueness with action grouping
-- ---------------------------------------------------------------------------
ALTER TABLE public.integration_functions
  ADD COLUMN IF NOT EXISTS action TEXT;

UPDATE public.integration_functions
SET action = CASE service_type
  WHEN 'dlt' THEN 'load'
  WHEN 'dbt' THEN 'transform'
  WHEN 'docling' THEN 'parse'
  ELSE NULL
END
WHERE action IS NULL;

ALTER TABLE public.integration_functions
  ADD CONSTRAINT IF NOT EXISTS integration_functions_action_fkey
  FOREIGN KEY (action) REFERENCES public.integration_actions(action) ON DELETE RESTRICT;

ALTER TABLE public.integration_functions
  ALTER COLUMN action SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.integration_functions'::regclass
      AND conname = 'integration_functions_unique_owner_project_type_key'
  ) THEN
    ALTER TABLE public.integration_functions
      DROP CONSTRAINT integration_functions_unique_owner_project_type_key;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.integration_functions'::regclass
      AND conname = 'integration_functions_unique_owner_project_action_key'
  ) THEN
    ALTER TABLE public.integration_functions
      ADD CONSTRAINT integration_functions_unique_owner_project_action_key
      UNIQUE (owner_id, project_id, action, function_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_integration_functions_owner_project_action
  ON public.integration_functions(owner_id, project_id, action);

COMMENT ON COLUMN public.integration_functions.action IS
  'Primary action category for this function (load/transform/parse/convert/export).';

NOTIFY pgrst, 'reload schema';


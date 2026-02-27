-- Migration 050: integration registry (services + functions)
-- Purpose:
-- - Provide a generic registry that can be tabulated by service_type (dlt, dbt, docling, ...)
-- - Store per-project service wiring config separately from callable "function buttons".

-- ---------------------------------------------------------------------------
-- integration_service_types: lookup table for UI tabulation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integration_service_types (
  service_type TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.integration_service_types IS
  'Lookup table for integration service_type keys used to tabulate registry UI (dlt, dbt, docling, ...).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_integration_service_types_updated_at'
  ) THEN
    CREATE TRIGGER set_integration_service_types_updated_at
    BEFORE UPDATE ON public.integration_service_types
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.integration_service_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS integration_service_types_select
  ON public.integration_service_types;
CREATE POLICY integration_service_types_select
  ON public.integration_service_types
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS integration_service_types_service_role
  ON public.integration_service_types;
CREATE POLICY integration_service_types_service_role
  ON public.integration_service_types
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.integration_service_types FROM anon, authenticated;
GRANT SELECT ON TABLE public.integration_service_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.integration_service_types TO service_role;

INSERT INTO public.integration_service_types (service_type, display_name, description)
VALUES
  ('docling', 'Docling', 'Document conversion/parsing track (docling-based).'),
  ('dlt', 'DLT', 'Load/ingest structured data into destinations using dlt pipelines.'),
  ('dbt', 'dbt', 'SQL transforms using dbt-core and adapters.')
ON CONFLICT (service_type) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- integration_services: per-project wiring config
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integration_services (
  service_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  project_id UUID NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
  service_type TEXT NOT NULL REFERENCES public.integration_service_types(service_type) ON DELETE RESTRICT,
  -- e.g. 'dlt-runner-service' / 'dbt-runner-service' / 'conversion-service'
  service_name TEXT NOT NULL,
  -- Base URL for the service (null means "use platform default wiring")
  base_url TEXT,
  auth_mode TEXT NOT NULL DEFAULT 'service_key'
    CHECK (auth_mode IN ('none', 'user_jwt', 'service_key')),
  -- Encrypted at the edge layer (AES-GCM); plaintext never stored.
  service_key_encrypted TEXT,
  config_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(config_jsonb) = 'object'),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT integration_services_unique_owner_project_type UNIQUE (owner_id, project_id, service_type)
);

COMMENT ON TABLE public.integration_services IS
  'Per-project wiring config for an integration service (base_url, auth, non-secret config).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_integration_services_updated_at'
  ) THEN
    CREATE TRIGGER set_integration_services_updated_at
    BEFORE UPDATE ON public.integration_services
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_integration_services_owner_project
  ON public.integration_services(owner_id, project_id);

ALTER TABLE public.integration_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS integration_services_select_own
  ON public.integration_services;
CREATE POLICY integration_services_select_own
  ON public.integration_services
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS integration_services_insert_own
  ON public.integration_services;
CREATE POLICY integration_services_insert_own
  ON public.integration_services
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS integration_services_update_own
  ON public.integration_services;
CREATE POLICY integration_services_update_own
  ON public.integration_services
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS integration_services_delete_own
  ON public.integration_services;
CREATE POLICY integration_services_delete_own
  ON public.integration_services
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS integration_services_service_role
  ON public.integration_services;
CREATE POLICY integration_services_service_role
  ON public.integration_services
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.integration_services FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.integration_services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.integration_services TO service_role;

-- ---------------------------------------------------------------------------
-- integration_functions: per-project callable functions ("buttons")
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integration_functions (
  function_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  project_id UUID NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
  service_type TEXT NOT NULL REFERENCES public.integration_service_types(service_type) ON DELETE RESTRICT,
  function_key TEXT NOT NULL,
  label TEXT NOT NULL,
  -- Python entrypoint import path (ex: "blockdata.integrations.dlt.sync_postgres:run")
  entrypoint TEXT NOT NULL,
  args_schema_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(args_schema_jsonb) = 'object'),
  required_secrets_jsonb JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(required_secrets_jsonb) = 'array'),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT integration_functions_unique_owner_project_type_key UNIQUE (owner_id, project_id, service_type, function_key)
);

COMMENT ON TABLE public.integration_functions IS
  'Per-project registry of callable integration functions rendered as UI buttons (service_type-scoped).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_integration_functions_updated_at'
  ) THEN
    CREATE TRIGGER set_integration_functions_updated_at
    BEFORE UPDATE ON public.integration_functions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_integration_functions_owner_project
  ON public.integration_functions(owner_id, project_id);

ALTER TABLE public.integration_functions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS integration_functions_select_own
  ON public.integration_functions;
CREATE POLICY integration_functions_select_own
  ON public.integration_functions
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS integration_functions_insert_own
  ON public.integration_functions;
CREATE POLICY integration_functions_insert_own
  ON public.integration_functions
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS integration_functions_update_own
  ON public.integration_functions;
CREATE POLICY integration_functions_update_own
  ON public.integration_functions
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS integration_functions_delete_own
  ON public.integration_functions;
CREATE POLICY integration_functions_delete_own
  ON public.integration_functions
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS integration_functions_service_role
  ON public.integration_functions;
CREATE POLICY integration_functions_service_role
  ON public.integration_functions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.integration_functions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.integration_functions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.integration_functions TO service_role;

NOTIFY pgrst, 'reload schema';


-- Migration 054: registry consolidation (additive phase)
-- Purpose:
-- - Keep existing schemas intact while moving to unified service_* registry.
-- - Register Supabase Edge runtime and seed edge functions in service_functions.
-- - Add project_service_config as the per-project service override surface.
-- - Backfill project_service_config from integration_services when possible.

-- ---------------------------------------------------------------------------
-- 1) Extend service_functions.function_type CHECK to include ingest/callback
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.service_functions'::regclass
      AND conname = 'service_functions_function_type_check'
  ) THEN
    ALTER TABLE public.service_functions
      DROP CONSTRAINT service_functions_function_type_check;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.service_functions'::regclass
      AND conname = 'service_functions_function_type_check'
  ) THEN
    ALTER TABLE public.service_functions
      ADD CONSTRAINT service_functions_function_type_check
      CHECK (function_type IN (
        'source', 'destination', 'transform', 'parse', 'convert',
        'export', 'test', 'utility', 'macro', 'custom',
        'ingest', 'callback'
      ));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Register a canonical Supabase Edge runtime in service_registry
-- ---------------------------------------------------------------------------
INSERT INTO public.service_registry (
  service_type,
  service_name,
  base_url,
  config,
  enabled
)
VALUES (
  'edge',
  'supabase-edge',
  'supabase://edge-runtime',
  '{
    "platform":"supabase",
    "base_path":"/functions/v1"
  }'::jsonb,
  true
)
ON CONFLICT (service_type, service_name) DO UPDATE
SET
  base_url = EXCLUDED.base_url,
  config = COALESCE(service_registry.config, '{}'::jsonb) || EXCLUDED.config,
  enabled = true,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3) Seed edge functions into unified service_functions
-- ---------------------------------------------------------------------------
WITH edge_service AS (
  SELECT sr.service_id
  FROM public.service_registry sr
  WHERE sr.service_type = 'edge'
    AND sr.service_name = 'supabase-edge'
  LIMIT 1
),
seed AS (
  SELECT *
  FROM (
    VALUES
      ('ingest',               'ingest',   'Ingest',               'Primary ingest endpoint for uploads and orchestration.', '/functions/v1/ingest',              'POST', '["edge","ingest","documents"]'::jsonb),
      ('conversion-complete',  'callback', 'Conversion Complete',  'Callback endpoint finalizing async conversion outputs.', '/functions/v1/conversion-complete', 'POST', '["edge","callback","conversion"]'::jsonb),
      ('trigger-parse',        'parse',    'Trigger Parse',        'Manual re-parse endpoint for already-uploaded sources.', '/functions/v1/trigger-parse',       'POST', '["edge","parse","reparse"]'::jsonb),
      ('upload-policy',        'utility',  'Upload Policy',        'Read-only runtime upload policy endpoint.', '/functions/v1/upload-policy', 'GET', '["edge","policy","upload"]'::jsonb),
      ('schemas',              'utility',  'Schemas',              'Schema catalog and schema operations endpoint.', '/functions/v1/schemas',      'POST', '["edge","schemas","config"]'::jsonb),
      ('runs',                 'utility',  'Runs',                 'Run management endpoint.', '/functions/v1/runs', 'POST', '["edge","runs","orchestration"]'::jsonb),
      ('worker',               'utility',  'Worker',               'Worker execution endpoint.', '/functions/v1/worker', 'POST', '["edge","worker","execution"]'::jsonb),
      ('export-jsonl',         'export',   'Export JSONL',         'Export endpoint for JSONL artifacts.', '/functions/v1/export-jsonl', 'GET', '["edge","export","jsonl"]'::jsonb),
      ('generate-citations',   'utility',  'Generate Citations',   'Citation generation endpoint.', '/functions/v1/generate-citations', 'POST', '["edge","citations","utility"]'::jsonb),
      ('admin-config',         'utility',  'Admin Config',         'Superuser runtime policy management endpoint.', '/functions/v1/admin-config', 'GET', '["edge","admin","policy"]'::jsonb),
      ('user-api-keys',        'utility',  'User API Keys',        'Per-user API key lifecycle endpoint.', '/functions/v1/user-api-keys', 'POST', '["edge","secrets","keys"]'::jsonb),
      ('agent-config',         'utility',  'Agent Config',         'Agent configuration management endpoint.', '/functions/v1/agent-config', 'GET', '["edge","agents","config"]'::jsonb),
      ('provider-connections', 'utility',  'Provider Connections', 'Provider auth/connection status endpoint.', '/functions/v1/provider-connections', 'GET', '["edge","providers","auth"]'::jsonb),
      ('flows',                'utility',  'Flows',                'Flow definition and lifecycle endpoint.', '/functions/v1/flows', 'POST', '["edge","flows","orchestration"]'::jsonb),
      ('test-api-key',         'test',     'Test API Key',         'Connectivity test endpoint for user-provided API keys.', '/functions/v1/test-api-key', 'POST', '["edge","test","keys"]'::jsonb)
  ) AS x(function_name, function_type, label, description, entrypoint, http_method, tags)
)
INSERT INTO public.service_functions (
  service_id,
  function_name,
  function_type,
  label,
  description,
  entrypoint,
  http_method,
  parameter_schema,
  tags
)
SELECT
  edge_service.service_id,
  seed.function_name,
  seed.function_type,
  seed.label,
  seed.description,
  seed.entrypoint,
  seed.http_method,
  '[]'::jsonb,
  seed.tags
FROM edge_service
JOIN seed ON TRUE
ON CONFLICT (service_id, function_name) DO UPDATE
SET
  function_type = EXCLUDED.function_type,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  entrypoint = EXCLUDED.entrypoint,
  http_method = EXCLUDED.http_method,
  tags = EXCLUDED.tags,
  enabled = true,
  updated_at = now();

DO $$
DECLARE
  seeded_count INTEGER;
BEGIN
  SELECT count(*)
  INTO seeded_count
  FROM public.service_functions sf
  JOIN public.service_registry sr ON sr.service_id = sf.service_id
  WHERE sr.service_type = 'edge'
    AND sr.service_name = 'supabase-edge'
    AND sf.function_name = ANY (ARRAY[
      'ingest',
      'conversion-complete',
      'trigger-parse',
      'upload-policy',
      'schemas',
      'runs',
      'worker',
      'export-jsonl',
      'generate-citations',
      'admin-config',
      'user-api-keys',
      'agent-config',
      'provider-connections',
      'flows',
      'test-api-key'
    ]::text[]);

  IF seeded_count <> 15 THEN
    RAISE EXCEPTION 'Expected 15 seeded supabase-edge functions, found %', seeded_count;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Add project_service_config (replacement for per-project service wiring)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_service_config (
  project_id UUID NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.service_registry(service_id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(config) = 'object'),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, service_id)
);

COMMENT ON TABLE public.project_service_config IS
  'Per-project service overrides for unified service_registry (config + enabled).';
COMMENT ON COLUMN public.project_service_config.config IS
  'Project-scoped configuration blob for the referenced service.';

CREATE INDEX IF NOT EXISTS project_service_config_service_id_idx
  ON public.project_service_config (service_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_project_service_config_updated_at'
  ) THEN
    CREATE TRIGGER set_project_service_config_updated_at
    BEFORE UPDATE ON public.project_service_config
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.project_service_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_service_config_select_own
  ON public.project_service_config;
CREATE POLICY project_service_config_select_own
  ON public.project_service_config
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT p.project_id
      FROM public.projects p
      WHERE p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS project_service_config_insert_own
  ON public.project_service_config;
CREATE POLICY project_service_config_insert_own
  ON public.project_service_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT p.project_id
      FROM public.projects p
      WHERE p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS project_service_config_update_own
  ON public.project_service_config;
CREATE POLICY project_service_config_update_own
  ON public.project_service_config
  FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT p.project_id
      FROM public.projects p
      WHERE p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.project_id
      FROM public.projects p
      WHERE p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS project_service_config_delete_own
  ON public.project_service_config;
CREATE POLICY project_service_config_delete_own
  ON public.project_service_config
  FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT p.project_id
      FROM public.projects p
      WHERE p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS project_service_config_service_role
  ON public.project_service_config;
CREATE POLICY project_service_config_service_role
  ON public.project_service_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.project_service_config FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_service_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_service_config TO service_role;

-- ---------------------------------------------------------------------------
-- 5) Backfill project_service_config from legacy integration_services
--    (guarded: integration tables may not exist in all environments)
-- ---------------------------------------------------------------------------
-- 5a. Ensure service_registry rows exist for legacy integration_services rows.
DO $$
BEGIN
  IF to_regclass('public.integration_services') IS NOT NULL THEN
    EXECUTE '
      INSERT INTO public.service_registry (
        service_type, service_name, base_url, config, enabled
      )
      SELECT DISTINCT
        isvc.service_type,
        isvc.service_name,
        COALESCE(NULLIF(isvc.base_url, ''''), ''legacy://integration-service''),
        jsonb_strip_nulls(
          jsonb_build_object(
            ''source'', ''integration_services_backfill'',
            ''auth_mode'', isvc.auth_mode
          )
        ),
        COALESCE(isvc.is_enabled, true)
      FROM public.integration_services isvc
      JOIN public.service_type_catalog stc
        ON stc.service_type = isvc.service_type
      LEFT JOIN public.service_registry sr
        ON sr.service_type = isvc.service_type
       AND sr.service_name = isvc.service_name
      WHERE sr.service_id IS NULL
    ';
  END IF;
END $$;

-- 5b. Backfill per-project config for matched services.
DO $$
BEGIN
  IF to_regclass('public.integration_services') IS NOT NULL THEN
    EXECUTE '
      INSERT INTO public.project_service_config (
        project_id, service_id, config, enabled
      )
      SELECT DISTINCT ON (isvc.project_id, sr.service_id)
        isvc.project_id,
        sr.service_id,
        jsonb_strip_nulls(
          COALESCE(isvc.config_jsonb, ''{}''::jsonb)
          || jsonb_build_object(
            ''auth_mode'', isvc.auth_mode,
            ''base_url'', isvc.base_url,
            ''service_key_encrypted'', isvc.service_key_encrypted,
            ''legacy_action'', isvc.action
          )
        ) AS config,
        COALESCE(isvc.is_enabled, true) AS enabled
      FROM public.integration_services isvc
      JOIN public.service_registry sr
        ON sr.service_type = isvc.service_type
       AND sr.service_name = isvc.service_name
      ORDER BY isvc.project_id, sr.service_id, isvc.updated_at DESC
      ON CONFLICT (project_id, service_id) DO UPDATE
      SET
        config = EXCLUDED.config,
        enabled = EXCLUDED.enabled,
        updated_at = now()
    ';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6) Refresh service_functions_view and PostgREST schema cache
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.service_functions_view AS
SELECT
  sf.function_id,
  sf.function_name,
  sf.function_type,
  sf.label,
  sf.description,
  sf.entrypoint,
  sf.http_method,
  sf.parameter_schema,
  sf.result_schema,
  sf.enabled AS function_enabled,
  sf.tags,
  sr.service_id,
  sr.service_type,
  sr.service_name,
  sr.base_url,
  sr.health_status,
  sr.enabled AS service_enabled,
  stc.label AS service_type_label
FROM public.service_functions sf
JOIN public.service_registry sr ON sr.service_id = sf.service_id
JOIN public.service_type_catalog stc ON stc.service_type = sr.service_type
WHERE sf.enabled = true AND sr.enabled = true;

GRANT SELECT ON public.service_functions_view TO authenticated;
GRANT SELECT ON public.service_functions_view TO service_role;

NOTIFY pgrst, 'reload schema';

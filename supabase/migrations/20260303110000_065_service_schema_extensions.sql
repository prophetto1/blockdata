-- Migration 065: Service schema extensions
-- Adds new metadata columns to service_registry and service_functions,
-- expands the function_type CHECK constraint, and registers the
-- 'pipeline-worker' service type.
--
-- Prerequisites: 050 (service_registry, service_functions, service_type_catalog)
-- Safe to re-run: uses ADD COLUMN IF NOT EXISTS + ON CONFLICT DO NOTHING.

-- ---------------------------------------------------------------------------
-- 1. Register pipeline-worker as a first-class service type
-- ---------------------------------------------------------------------------

INSERT INTO public.service_type_catalog (service_type, label, description)
VALUES (
  'pipeline-worker',
  'Pipeline Worker',
  'FastAPI native plugin execution engine (Kestra-compatible tasks)'
)
ON CONFLICT (service_type) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. service_registry — 4 new metadata columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.service_registry
  ADD COLUMN IF NOT EXISTS description  TEXT,
  ADD COLUMN IF NOT EXISTS auth_type    TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS auth_config  JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS docs_url     TEXT;

-- ---------------------------------------------------------------------------
-- 3. service_functions — 14 new metadata columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.service_functions
  ADD COLUMN IF NOT EXISTS long_description  TEXT,
  ADD COLUMN IF NOT EXISTS content_type      TEXT NOT NULL DEFAULT 'application/json',
  ADD COLUMN IF NOT EXISTS auth_type         TEXT,
  ADD COLUMN IF NOT EXISTS auth_config       JSONB,
  ADD COLUMN IF NOT EXISTS request_example   JSONB,
  ADD COLUMN IF NOT EXISTS response_example  JSONB,
  ADD COLUMN IF NOT EXISTS examples          JSONB NOT NULL DEFAULT '[]'::jsonb
                                             CHECK (jsonb_typeof(examples) = 'array'),
  ADD COLUMN IF NOT EXISTS metrics           JSONB NOT NULL DEFAULT '[]'::jsonb
                                             CHECK (jsonb_typeof(metrics) = 'array'),
  ADD COLUMN IF NOT EXISTS when_to_use       TEXT,
  ADD COLUMN IF NOT EXISTS provider_docs_url TEXT,
  ADD COLUMN IF NOT EXISTS deprecated        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS beta              BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_task_class TEXT,
  ADD COLUMN IF NOT EXISTS plugin_group      TEXT;

-- ---------------------------------------------------------------------------
-- 4. Expand function_type CHECK to include 'flow', 'ingest', 'callback'
-- ---------------------------------------------------------------------------
-- Drop the auto-named column-level constraint and replace with a table-level
-- named constraint so future migrations can reference it cleanly.

ALTER TABLE public.service_functions
  DROP CONSTRAINT IF EXISTS service_functions_function_type_check;

ALTER TABLE public.service_functions
  ADD CONSTRAINT service_functions_function_type_check
    CHECK (function_type IN (
      'source', 'destination', 'transform', 'parse', 'convert',
      'export', 'test', 'utility', 'macro', 'custom',
      'ingest', 'callback', 'flow'
    ));

-- ---------------------------------------------------------------------------
-- 5. Index new searchable columns
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_service_functions_source_task_class
  ON public.service_functions (source_task_class);

CREATE INDEX IF NOT EXISTS idx_service_functions_plugin_group
  ON public.service_functions (plugin_group);

CREATE INDEX IF NOT EXISTS idx_service_functions_deprecated
  ON public.service_functions (deprecated)
  WHERE deprecated = true;

-- ---------------------------------------------------------------------------
-- 6. Refresh service_functions_view to include new columns
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
  sf.enabled            AS function_enabled,
  sf.tags,
  sr.service_id,
  sr.service_type,
  sr.service_name,
  sr.base_url,
  sr.health_status,
  sr.enabled            AS service_enabled,
  stc.label             AS service_type_label,
  sf.long_description,
  sf.content_type,
  sf.request_example,
  sf.response_example,
  sf.examples,
  sf.metrics,
  sf.auth_type          AS function_auth_type,
  sf.auth_config        AS function_auth_config,
  sf.when_to_use,
  sf.provider_docs_url,
  sf.deprecated,
  sf.beta,
  sf.source_task_class,
  sf.plugin_group,
  sr.description        AS service_description,
  sr.auth_type          AS service_auth_type,
  sr.docs_url,
  sf.created_at         AS function_created_at,
  sf.updated_at         AS function_updated_at
FROM public.service_functions sf
JOIN public.service_registry  sr  ON sr.service_id  = sf.service_id
JOIN public.service_type_catalog stc ON stc.service_type = sr.service_type
WHERE sf.enabled = true
  AND sr.enabled = true;

COMMENT ON VIEW public.service_functions_view IS
  'Joined view of functions + services for UI rendering. Includes all metadata columns. Filter by service_type for tab content.';

GRANT SELECT ON public.service_functions_view TO authenticated;
GRANT SELECT ON public.service_functions_view TO service_role;

-- ---------------------------------------------------------------------------
-- 7. Update pipeline-worker service type: 'custom' → 'pipeline-worker'
--    (registered in migration 061 as 'custom'; now has its proper type)
-- ---------------------------------------------------------------------------

UPDATE public.service_registry
SET
  service_type = 'pipeline-worker',
  description  = 'Native Kestra-compatible task execution engine (FastAPI)',
  updated_at   = now()
WHERE service_id = '00000000-0000-0000-0000-000000000100'
  AND service_type = 'custom';

NOTIFY pgrst, 'reload schema';

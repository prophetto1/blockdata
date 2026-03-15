-- Dual-level pipeline stage categorization.
-- Service level: primary_stage (TEXT) — what stage this service primarily serves.
-- Function level: bd_stage (TEXT) — the BD-native execution stage for this function.

ALTER TABLE public.service_registry
  ADD COLUMN IF NOT EXISTS primary_stage text;

ALTER TABLE public.service_registry
  ADD COLUMN IF NOT EXISTS execution_plane text NOT NULL DEFAULT 'edge'
    CHECK (execution_plane IN ('edge', 'fastapi', 'worker'));

COMMENT ON COLUMN public.service_registry.primary_stage IS
  'Primary pipeline stage: source, destination, load, transform, parse, orchestration, utility, conversion, notification';
COMMENT ON COLUMN public.service_registry.execution_plane IS
  'Where this service runs. edge = Supabase Edge Functions (lightweight auth/CRUD). fastapi = platform-api (plugin execution, data movement, orchestration). worker = async background worker.';

ALTER TABLE public.service_functions
  ADD COLUMN IF NOT EXISTS bd_stage text NOT NULL DEFAULT 'custom'
    CHECK (bd_stage IN (
      'source', 'destination', 'transform', 'parse', 'convert',
      'export', 'test', 'utility', 'orchestration', 'notification', 'custom'
    ));

COMMENT ON COLUMN public.service_functions.bd_stage IS
  'BD-native execution stage. Used for routing and UI. Takes precedence over function_type.';

CREATE INDEX IF NOT EXISTS idx_service_functions_bd_stage
  ON public.service_functions (bd_stage);

-- Expand function_type CHECK to include values used in pipeline-worker.
ALTER TABLE public.service_functions
  DROP CONSTRAINT IF EXISTS service_functions_function_type_check;
ALTER TABLE public.service_functions
  ADD CONSTRAINT service_functions_function_type_check
    CHECK (function_type IN (
      'source', 'destination', 'transform', 'parse', 'convert',
      'export', 'test', 'utility', 'macro', 'custom',
      'ingest', 'callback', 'flow'
    ));

-- Backfill bd_stage from existing function_type.
UPDATE public.service_functions SET bd_stage = function_type
  WHERE function_type IN ('source', 'destination', 'transform', 'parse', 'convert', 'export', 'test', 'utility');
UPDATE public.service_functions SET bd_stage = 'orchestration'
  WHERE function_type = 'flow';

-- Backfill primary_stage and execution_plane for seeded services.
-- Control plane (edge): lightweight auth, credential CRUD, config
-- Execution plane (fastapi): plugin execution, data movement, orchestration
UPDATE public.service_registry SET primary_stage = 'load', execution_plane = 'fastapi' WHERE service_name = 'load-runner';
UPDATE public.service_registry SET primary_stage = 'transform', execution_plane = 'fastapi' WHERE service_name = 'transform-runner';
UPDATE public.service_registry SET primary_stage = 'parse', execution_plane = 'fastapi' WHERE service_name = 'docling-service';
UPDATE public.service_registry SET primary_stage = 'conversion', execution_plane = 'fastapi' WHERE service_name = 'conversion-service';
UPDATE public.service_registry SET execution_plane = 'fastapi' WHERE service_name = 'pipeline-worker';
UPDATE public.service_registry SET execution_plane = 'fastapi' WHERE service_name = 'eyecite';
-- supabase-edge stays on 'edge' (the default). All other custom services run on FastAPI.

-- Refresh the convenience view.
CREATE OR REPLACE VIEW public.service_functions_view AS
SELECT
  sf.function_id, sf.function_name, sf.function_type, sf.bd_stage,
  sf.label, sf.description, sf.entrypoint, sf.http_method,
  sf.parameter_schema, sf.result_schema, sf.enabled AS function_enabled, sf.tags,
  sr.service_id, sr.service_type, sr.service_name, sr.base_url,
  sr.health_status, sr.enabled AS service_enabled, sr.primary_stage, sr.execution_plane,
  stc.label AS service_type_label
FROM public.service_functions sf
JOIN public.service_registry sr ON sr.service_id = sf.service_id
JOIN public.service_type_catalog stc ON stc.service_type = sr.service_type
WHERE sf.enabled = true AND sr.enabled = true;

GRANT SELECT ON public.service_functions_view TO authenticated;
GRANT SELECT ON public.service_functions_view TO service_role;

NOTIFY pgrst, 'reload schema';

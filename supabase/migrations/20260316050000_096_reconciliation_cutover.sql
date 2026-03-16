-- ============================================================================
-- RECONCILIATION CUTOVER: Rename old-name tables to canonical service-plane
-- schema, add missing columns/tables, and bring remote into alignment with
-- the post-095 canonical model.
--
-- This script is a one-time bridge. It does NOT replay migrations 033-092.
-- It treats the remote database as operational truth and transforms it.
--
-- After this script succeeds, run `supabase migration repair` to mark the
-- superseded migrations as applied, then resume normal forward-only flow.
-- ============================================================================

BEGIN;

-- =========================================================================
-- 1. Drop dependent view (will be recreated in final shape at the end)
-- =========================================================================
DROP VIEW IF EXISTS public.view_service_functions CASCADE;

-- =========================================================================
-- 2. Rename tables to canonical names
--    PG ALTER TABLE RENAME updates pg_class.relname. All FKs, indexes,
--    RLS policies, triggers, and Realtime publication entries follow
--    automatically (they reference by OID, not name).
-- =========================================================================
ALTER TABLE public.registry_services RENAME TO service_registry;
ALTER TABLE public.registry_service_functions RENAME TO service_functions;
ALTER TABLE public.user_service_runs RENAME TO service_runs;

-- =========================================================================
-- 3. Create service_type_catalog (missing entirely on remote)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.service_type_catalog (
  service_type text PRIMARY KEY,
  label text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_type_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_type_catalog_select
  ON public.service_type_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY service_type_catalog_service_role
  ON public.service_type_catalog FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.service_type_catalog FROM anon, authenticated;
GRANT SELECT ON TABLE public.service_type_catalog TO authenticated;
GRANT ALL ON TABLE public.service_type_catalog TO service_role;

-- Seed required service types
INSERT INTO public.service_type_catalog (service_type, label, description) VALUES
  ('conversion', 'Conversion', 'File conversion services'),
  ('custom', 'Custom', 'Custom / user-defined services'),
  ('dbt', 'dbt (Transform)', 'dbt transformation services'),
  ('dlt', 'dlt (Load)', 'dlt loading services'),
  ('docling', 'Docling (Parse)', 'Docling parsing services'),
  ('edge', 'Edge Functions', 'Supabase Edge Function services'),
  ('integration', 'Integration', 'External service integrations'),
  ('notification', 'Notifications', 'Notification delivery services'),
  ('pipeline-worker', 'Pipeline Worker', 'Background pipeline workers')
ON CONFLICT (service_type) DO NOTHING;

-- =========================================================================
-- 4. Add missing columns from migration 093 (stage categorization)
-- =========================================================================
ALTER TABLE public.service_registry
  ADD COLUMN IF NOT EXISTS primary_stage text;

ALTER TABLE public.service_registry
  ADD COLUMN IF NOT EXISTS execution_plane text NOT NULL DEFAULT 'edge'
    CHECK (execution_plane IN ('edge', 'fastapi', 'worker'));

COMMENT ON COLUMN public.service_registry.primary_stage IS
  'Primary pipeline stage: source, destination, load, transform, parse, orchestration, utility, conversion, notification';
COMMENT ON COLUMN public.service_registry.execution_plane IS
  'Where this service runs. edge = Supabase Edge Functions. fastapi = platform-api. worker = async background.';

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

-- Expand function_type CHECK
ALTER TABLE public.service_functions
  DROP CONSTRAINT IF EXISTS service_functions_function_type_check;
ALTER TABLE public.service_functions
  ADD CONSTRAINT service_functions_function_type_check
    CHECK (function_type IN (
      'source', 'destination', 'transform', 'parse', 'convert',
      'export', 'test', 'utility', 'macro', 'custom',
      'ingest', 'callback', 'flow'
    ));

-- Backfill bd_stage from function_type
UPDATE public.service_functions SET bd_stage = function_type
  WHERE function_type IN ('source', 'destination', 'transform', 'parse', 'convert', 'export', 'test', 'utility');
UPDATE public.service_functions SET bd_stage = 'orchestration'
  WHERE function_type = 'flow';

-- Backfill primary_stage and execution_plane for seeded services
UPDATE public.service_registry SET primary_stage = 'load', execution_plane = 'fastapi' WHERE service_name = 'load-runner';
UPDATE public.service_registry SET primary_stage = 'transform', execution_plane = 'fastapi' WHERE service_name = 'transform-runner';
UPDATE public.service_registry SET primary_stage = 'parse', execution_plane = 'fastapi' WHERE service_name = 'docling-service';
UPDATE public.service_registry SET primary_stage = 'conversion', execution_plane = 'fastapi' WHERE service_name = 'conversion-service';
UPDATE public.service_registry SET execution_plane = 'fastapi' WHERE service_name = 'pipeline-worker';
UPDATE public.service_registry SET execution_plane = 'fastapi' WHERE service_name = 'eyecite';

-- =========================================================================
-- 5. Add missing columns from migration 094 (dest identity + ownership)
-- =========================================================================
ALTER TABLE public.service_runs
  ADD COLUMN IF NOT EXISTS dest_function_id uuid REFERENCES public.service_functions(function_id),
  ADD COLUMN IF NOT EXISTS dest_service_id uuid REFERENCES public.service_registry(service_id),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Expand status CHECK to include 'partial'
ALTER TABLE public.service_runs DROP CONSTRAINT IF EXISTS service_runs_status_check;
ALTER TABLE public.service_runs ADD CONSTRAINT service_runs_status_check
  CHECK (status IN ('pending', 'running', 'complete', 'partial', 'failed', 'cancelled'));

-- =========================================================================
-- 6. Replace service_runs RLS with creator-owned model
-- =========================================================================
DROP POLICY IF EXISTS service_runs_select ON public.service_runs;
DROP POLICY IF EXISTS service_runs_insert ON public.service_runs;

CREATE POLICY service_runs_select ON public.service_runs FOR SELECT TO authenticated
  USING (created_by = auth.uid());

-- =========================================================================
-- 7. Create service_run_items table (from 094)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.service_run_items (
  item_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES public.service_runs(run_id) ON DELETE CASCADE,
  item_key    text NOT NULL,
  item_type   text NOT NULL DEFAULT 'file',
  status      text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'complete', 'failed')),
  rows_written  integer NOT NULL DEFAULT 0,
  rows_failed   integer NOT NULL DEFAULT 0,
  error_message text,
  storage_uri   text,
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_run_items_run ON public.service_run_items(run_id);
CREATE INDEX IF NOT EXISTS idx_service_run_items_status ON public.service_run_items(run_id, status) WHERE status = 'pending';

ALTER TABLE public.service_run_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_run_items_select ON public.service_run_items FOR SELECT TO authenticated
  USING (run_id IN (
    SELECT sr.run_id FROM public.service_runs sr
    WHERE sr.created_by = auth.uid()
  ));
CREATE POLICY service_run_items_service_role ON public.service_run_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.service_run_items FROM anon, authenticated;
GRANT SELECT ON TABLE public.service_run_items TO authenticated;
GRANT ALL ON TABLE public.service_run_items TO service_role;

-- =========================================================================
-- 8. Create claim_run_item RPC (from 094)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.claim_run_item(
  p_run_id uuid,
  p_limit integer DEFAULT 1
)
RETURNS SETOF public.service_run_items
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT i.item_id
    FROM public.service_run_items i
    WHERE i.run_id = p_run_id
      AND i.status = 'pending'
    ORDER BY i.item_key, i.item_id
    LIMIT GREATEST(1, p_limit)
    FOR UPDATE OF i SKIP LOCKED
  )
  UPDATE public.service_run_items i
  SET status = 'running', started_at = now()
  FROM candidate
  WHERE i.item_id = candidate.item_id
  RETURNING i.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_run_item(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_run_item(uuid, integer) TO service_role;

-- =========================================================================
-- 9. Realtime publication
-- =========================================================================
-- Tables renamed by OID — publication already tracks service_registry and
-- service_functions under their new names. Add the new tables.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_runs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_run_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================================
-- 10. Seed GCS and ArangoDB services (from 095)
-- =========================================================================
INSERT INTO public.service_registry (service_id, service_type, service_name, base_url, config, primary_stage, execution_plane)
VALUES (
  'b0000000-0000-0000-0000-000000000001', 'integration', 'gcs',
  'http://localhost:8000',
  '{"origin": "io.kestra.plugin.gcp.gcs"}'::jsonb, 'source', 'fastapi'
) ON CONFLICT (service_type, service_name) DO UPDATE SET primary_stage = EXCLUDED.primary_stage, execution_plane = EXCLUDED.execution_plane;

INSERT INTO public.service_functions (service_id, function_name, function_type, bd_stage, label, entrypoint, http_method, parameter_schema, description, tags)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'gcs_list', 'source', 'source',
   'List Objects', '/gcs_list', 'POST',
   '[{"name":"connection_id","type":"string","required":true},{"name":"bucket","type":"string","required":true},{"name":"prefix","type":"string","required":false},{"name":"glob","type":"string","required":false,"default":"*.csv"}]'::jsonb,
   'List objects in a GCS bucket.', '["gcs","source","list"]'::jsonb),
  ('b0000000-0000-0000-0000-000000000001', 'gcs_download_csv', 'source', 'source',
   'Download CSV as JSON', '/gcs_download_csv', 'POST',
   '[{"name":"connection_id","type":"string","required":true},{"name":"bucket","type":"string","required":true},{"name":"object_name","type":"string","required":true},{"name":"key_column","type":"string","required":false}]'::jsonb,
   'Download a CSV from GCS, parse rows into JSON documents, write JSONL to platform storage.',
   '["gcs","source","csv","download"]'::jsonb)
ON CONFLICT (service_id, function_name) DO NOTHING;

INSERT INTO public.service_registry (service_id, service_type, service_name, base_url, config, primary_stage, execution_plane)
VALUES (
  'b0000000-0000-0000-0000-000000000002', 'integration', 'arangodb',
  'http://localhost:8000',
  '{"origin": "blockdata.arangodb"}'::jsonb, 'destination', 'fastapi'
) ON CONFLICT (service_type, service_name) DO UPDATE SET primary_stage = EXCLUDED.primary_stage, execution_plane = EXCLUDED.execution_plane;

INSERT INTO public.service_functions (service_id, function_name, function_type, bd_stage, label, entrypoint, http_method, parameter_schema, description, tags)
VALUES
  ('b0000000-0000-0000-0000-000000000002', 'arangodb_load', 'destination', 'destination',
   'Load Documents', '/arangodb_load', 'POST',
   '[{"name":"connection_id","type":"string","required":true},{"name":"collection","type":"string","required":true},{"name":"source_uri","type":"string","required":false,"description":"JSONL file in platform storage"},{"name":"documents","type":"array","required":false,"description":"Inline JSON documents"},{"name":"create_collection","type":"boolean","required":false,"default":false}]'::jsonb,
   'Load JSON documents into an ArangoDB collection.',
   '["arangodb","destination","load","bulk"]'::jsonb)
ON CONFLICT (service_id, function_name) DO NOTHING;

-- Map GCS to imported catalog items
UPDATE public.integration_catalog_items
  SET mapped_service_id = 'b0000000-0000-0000-0000-000000000001'
  WHERE plugin_group = 'io.kestra.plugin.gcp.gcs' AND mapped_service_id IS NULL;

-- =========================================================================
-- 11. Recreate service_functions_view in final canonical shape
-- =========================================================================
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

-- =========================================================================
-- 12. Backward-compat views for deployed edge functions using old names
--     These are read-only. Drop once all edge functions are redeployed.
-- =========================================================================
CREATE OR REPLACE VIEW public.registry_services AS SELECT * FROM public.service_registry;
CREATE OR REPLACE VIEW public.registry_service_functions AS SELECT * FROM public.service_functions;
CREATE OR REPLACE VIEW public.user_service_runs AS SELECT * FROM public.service_runs;

GRANT SELECT ON public.registry_services TO authenticated;
GRANT SELECT ON public.registry_services TO service_role;
GRANT SELECT ON public.registry_service_functions TO authenticated;
GRANT SELECT ON public.registry_service_functions TO service_role;
GRANT SELECT ON public.user_service_runs TO authenticated;
GRANT SELECT ON public.user_service_runs TO service_role;

-- =========================================================================
-- 13. Schema reload
-- =========================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;

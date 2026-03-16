-- Migration 050: unified service registry
-- Purpose:
-- - Single registry for ALL backend services and their callable functions.
-- - Generalizes the existing conversion_service_catalog / edge_service_catalog pattern.
-- - Filterable by service_type (dlt, dbt, docling, edge, conversion, etc.).
-- - Each row = one callable function with its parameter schema.
-- - Supports the Advanced Config page (function buttons) and Load tab (source cards).

-- ---------------------------------------------------------------------------
-- 1. service_type_catalog — enum table for service types
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_type_catalog (
  service_type TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.service_type_catalog (service_type, label, description)
VALUES
  ('dlt',        'dlt (Load)',       'Data load tool — extract and load from sources to destinations'),
  ('dbt',        'dbt (Transform)',  'Data build tool — SQL-based transformations on loaded data'),
  ('docling',    'Docling (Parse)',  'Document parsing and conversion service'),
  ('edge',       'Edge Functions',   'Supabase Edge Functions (Deno/TypeScript)'),
  ('conversion', 'Conversion',       'File format conversion services'),
  ('custom',     'Custom',           'User-defined Python services')
ON CONFLICT (service_type) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. service_registry — registered backend service instances
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_registry (
  service_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL REFERENCES public.service_type_catalog(service_type),
  service_name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  health_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (health_status IN ('online', 'offline', 'degraded', 'unknown')),
  last_heartbeat TIMESTAMPTZ,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_type, service_name)
);

COMMENT ON TABLE public.service_registry IS
  'Registered backend service instances. Each row = one running service.';
COMMENT ON COLUMN public.service_registry.service_type IS
  'Service category (dlt, dbt, docling, edge, conversion, custom).';
COMMENT ON COLUMN public.service_registry.base_url IS
  'Base URL for the service (e.g., http://ubuntu-box:8000).';
COMMENT ON COLUMN public.service_registry.health_status IS
  'Last known health: online, offline, degraded, unknown.';
COMMENT ON COLUMN public.service_registry.config IS
  'Service-level config (credentials ref, default settings, etc.).';

-- ---------------------------------------------------------------------------
-- 3. service_functions — callable functions per service
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_functions (
  function_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.service_registry(service_id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  function_type TEXT NOT NULL
    CHECK (function_type IN (
      'source', 'destination', 'transform', 'parse', 'convert',
      'export', 'test', 'utility', 'macro', 'custom'
    )),
  label TEXT NOT NULL,
  description TEXT,
  entrypoint TEXT NOT NULL,
  http_method TEXT NOT NULL DEFAULT 'POST'
    CHECK (http_method IN ('GET', 'POST', 'PUT', 'DELETE')),
  parameter_schema JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(parameter_schema) = 'array'),
  result_schema JSONB DEFAULT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(tags) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_id, function_name)
);

COMMENT ON TABLE public.service_functions IS
  'Callable functions per service. Each row = one function button in the UI.';
COMMENT ON COLUMN public.service_functions.function_type IS
  'Category: source (dlt), transform (dbt), parse (docling), etc.';
COMMENT ON COLUMN public.service_functions.entrypoint IS
  'API path relative to service base_url (e.g., /dlt/pipelines/run).';
COMMENT ON COLUMN public.service_functions.parameter_schema IS
  'JSON array of parameter definitions: [{name, type, required, default, description}].';
COMMENT ON COLUMN public.service_functions.result_schema IS
  'Expected result shape (optional documentation).';
COMMENT ON COLUMN public.service_functions.tags IS
  'Searchable tags for filtering (e.g., ["filesystem", "csv", "bulk"]).';

CREATE INDEX IF NOT EXISTS service_functions_service_id_idx
  ON public.service_functions (service_id);
CREATE INDEX IF NOT EXISTS service_functions_function_type_idx
  ON public.service_functions (function_type);
CREATE INDEX IF NOT EXISTS service_functions_tags_idx
  ON public.service_functions USING GIN (tags);

-- ---------------------------------------------------------------------------
-- 4. service_runs — execution history for any service function
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_id UUID NOT NULL REFERENCES public.service_functions(function_id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.service_registry(service_id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(project_id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'complete', 'failed', 'cancelled')),
  config_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  error_message TEXT,
  rows_affected BIGINT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.service_runs IS
  'Execution history for any service function. Unified run tracking.';
COMMENT ON COLUMN public.service_runs.config_snapshot IS
  'The exact config/parameters used for this run (frozen at execution time).';
COMMENT ON COLUMN public.service_runs.result IS
  'Structured result data returned by the service.';

CREATE INDEX IF NOT EXISTS service_runs_function_id_idx
  ON public.service_runs (function_id);
CREATE INDEX IF NOT EXISTS service_runs_service_id_idx
  ON public.service_runs (service_id);
CREATE INDEX IF NOT EXISTS service_runs_project_id_idx
  ON public.service_runs (project_id);
CREATE INDEX IF NOT EXISTS service_runs_status_idx
  ON public.service_runs (status);
CREATE INDEX IF NOT EXISTS service_runs_created_at_idx
  ON public.service_runs (created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. RLS policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.service_type_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_runs ENABLE ROW LEVEL SECURITY;

-- service_type_catalog: read-only for authenticated
CREATE POLICY service_type_catalog_select
  ON public.service_type_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY service_type_catalog_service_role
  ON public.service_type_catalog FOR ALL TO service_role USING (true) WITH CHECK (true);

-- service_registry: read-only for authenticated, full for service_role
CREATE POLICY service_registry_select
  ON public.service_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY service_registry_service_role
  ON public.service_registry FOR ALL TO service_role USING (true) WITH CHECK (true);

-- service_functions: read-only for authenticated, full for service_role
CREATE POLICY service_functions_select
  ON public.service_functions FOR SELECT TO authenticated USING (true);
CREATE POLICY service_functions_service_role
  ON public.service_functions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- service_runs: users see their own project runs, service_role sees all
CREATE POLICY service_runs_select
  ON public.service_runs FOR SELECT TO authenticated
  USING (
    project_id IS NULL
    OR project_id IN (
      SELECT p.project_id FROM public.projects p WHERE p.owner_id = auth.uid()
    )
  );
CREATE POLICY service_runs_insert
  ON public.service_runs FOR INSERT TO authenticated
  WITH CHECK (
    project_id IS NULL
    OR project_id IN (
      SELECT p.project_id FROM public.projects p WHERE p.owner_id = auth.uid()
    )
  );
CREATE POLICY service_runs_service_role
  ON public.service_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 6. Grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.service_type_catalog FROM anon, authenticated;
GRANT SELECT ON TABLE public.service_type_catalog TO authenticated;
GRANT ALL ON TABLE public.service_type_catalog TO service_role;

REVOKE ALL ON TABLE public.service_registry FROM anon, authenticated;
GRANT SELECT ON TABLE public.service_registry TO authenticated;
GRANT ALL ON TABLE public.service_registry TO service_role;

REVOKE ALL ON TABLE public.service_functions FROM anon, authenticated;
GRANT SELECT ON TABLE public.service_functions TO authenticated;
GRANT ALL ON TABLE public.service_functions TO service_role;

REVOKE ALL ON TABLE public.service_runs FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.service_runs TO authenticated;
GRANT ALL ON TABLE public.service_runs TO service_role;

-- ---------------------------------------------------------------------------
-- 7. Seed: register the pipeline service with dlt + dbt functions
-- ---------------------------------------------------------------------------
-- The pipeline service (Ubuntu box) registers itself on startup.
-- This seed provides the initial catalog so the UI has something to render.

INSERT INTO public.service_registry (service_id, service_type, service_name, base_url, config)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'dlt', 'load-runner', 'http://localhost:8000', '{"version": "0.1.0"}'::jsonb),
  ('a0000000-0000-0000-0000-000000000002', 'dbt', 'transform-runner', 'http://localhost:8000', '{"version": "0.1.0"}'::jsonb),
  ('a0000000-0000-0000-0000-000000000003', 'docling', 'docling-service', 'http://localhost:5001', '{"version": "2.0"}'::jsonb)
ON CONFLICT (service_type, service_name) DO NOTHING;

-- dlt source functions
INSERT INTO public.service_functions (service_id, function_name, function_type, label, entrypoint, parameter_schema, description, tags)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'filesystem', 'source', 'Load from Files', '/dlt/run', '[
    {"name": "path", "type": "string", "required": true, "description": "Local path or bucket URL"},
    {"name": "file_glob", "type": "string", "required": false, "default": "*", "description": "File pattern (e.g., *.csv.bz2)"},
    {"name": "format", "type": "enum", "required": false, "default": "csv", "values": ["csv", "jsonl", "parquet"], "description": "File format"},
    {"name": "table_name", "type": "string", "required": true, "description": "Destination table name"},
    {"name": "write_disposition", "type": "enum", "required": false, "default": "replace", "values": ["replace", "append", "merge"], "description": "Write mode"},
    {"name": "primary_key", "type": "string", "required": false, "description": "Primary key column for merge mode"}
  ]'::jsonb, 'Load CSV, JSON, or Parquet files from local disk or cloud storage.', '["filesystem", "csv", "json", "parquet", "bulk"]'::jsonb),

  ('a0000000-0000-0000-0000-000000000001', 'rest_api', 'source', 'Load from REST API', '/dlt/run', '[
    {"name": "base_url", "type": "string", "required": true, "description": "API base URL"},
    {"name": "auth_type", "type": "enum", "required": false, "values": ["none", "bearer", "api_key", "basic"], "description": "Authentication method"},
    {"name": "auth_token", "type": "secret", "required": false, "description": "Auth token or API key"},
    {"name": "endpoints", "type": "json", "required": true, "description": "Array of endpoint configs [{path, name, primary_key}]"},
    {"name": "paginator", "type": "enum", "required": false, "values": ["json_link", "offset", "page_number", "cursor", "none"], "description": "Pagination strategy"},
    {"name": "write_disposition", "type": "enum", "required": false, "default": "replace", "values": ["replace", "append", "merge"], "description": "Write mode"}
  ]'::jsonb, 'Load data from any REST API with pagination and auth support.', '["api", "rest", "http", "json"]'::jsonb),

  ('a0000000-0000-0000-0000-000000000001', 'sql_database', 'source', 'Load from Database', '/dlt/run', '[
    {"name": "connection_string", "type": "secret", "required": true, "description": "SQLAlchemy connection string"},
    {"name": "schema", "type": "string", "required": false, "description": "Source schema name"},
    {"name": "tables", "type": "json", "required": false, "description": "Array of table names to load (all if empty)"},
    {"name": "write_disposition", "type": "enum", "required": false, "default": "replace", "values": ["replace", "append", "merge"], "description": "Write mode"},
    {"name": "incremental_field", "type": "string", "required": false, "description": "Column for incremental loading"}
  ]'::jsonb, 'Mirror tables from any SQL database (Postgres, MySQL, MSSQL, etc.).', '["database", "sql", "postgres", "mysql", "mirror"]'::jsonb)
ON CONFLICT (service_id, function_name) DO NOTHING;

-- dbt transform functions
INSERT INTO public.service_functions (service_id, function_name, function_type, label, entrypoint, parameter_schema, description, tags)
VALUES
  ('a0000000-0000-0000-0000-000000000002', 'dbt_run', 'transform', 'Run Models', '/dbt/run', '[
    {"name": "project_dir", "type": "string", "required": true, "description": "Path to dbt project"},
    {"name": "select", "type": "string", "required": false, "description": "Model selector (e.g., +my_model)"},
    {"name": "target", "type": "string", "required": false, "description": "Profile target"},
    {"name": "vars", "type": "json", "required": false, "description": "dbt variables as JSON object"},
    {"name": "full_refresh", "type": "boolean", "required": false, "default": false, "description": "Force full refresh"}
  ]'::jsonb, 'Execute dbt models (materialize SQL transformations).', '["dbt", "transform", "sql", "model"]'::jsonb),

  ('a0000000-0000-0000-0000-000000000002', 'dbt_test', 'test', 'Run Tests', '/dbt/test', '[
    {"name": "project_dir", "type": "string", "required": true, "description": "Path to dbt project"},
    {"name": "select", "type": "string", "required": false, "description": "Test selector"},
    {"name": "target", "type": "string", "required": false, "description": "Profile target"}
  ]'::jsonb, 'Run dbt data quality tests.', '["dbt", "test", "quality"]'::jsonb),

  ('a0000000-0000-0000-0000-000000000002', 'dbt_build', 'transform', 'Build (Run + Test)', '/dbt/build', '[
    {"name": "project_dir", "type": "string", "required": true, "description": "Path to dbt project"},
    {"name": "select", "type": "string", "required": false, "description": "Model selector"},
    {"name": "target", "type": "string", "required": false, "description": "Profile target"},
    {"name": "vars", "type": "json", "required": false, "description": "dbt variables"},
    {"name": "full_refresh", "type": "boolean", "required": false, "default": false, "description": "Force full refresh"}
  ]'::jsonb, 'Run + test + snapshot + seed in DAG order.', '["dbt", "build", "transform", "test"]'::jsonb),

  ('a0000000-0000-0000-0000-000000000002', 'dbt_show', 'utility', 'Preview Query', '/dbt/show', '[
    {"name": "project_dir", "type": "string", "required": true, "description": "Path to dbt project"},
    {"name": "select", "type": "string", "required": true, "description": "Model to preview"},
    {"name": "target", "type": "string", "required": false, "description": "Profile target"},
    {"name": "limit", "type": "number", "required": false, "default": 100, "description": "Row limit"}
  ]'::jsonb, 'Preview model output without materializing.', '["dbt", "preview", "show"]'::jsonb),

  ('a0000000-0000-0000-0000-000000000002', 'dbt_compile', 'utility', 'Compile SQL', '/dbt/compile', '[
    {"name": "project_dir", "type": "string", "required": true, "description": "Path to dbt project"},
    {"name": "select", "type": "string", "required": false, "description": "Model selector"},
    {"name": "target", "type": "string", "required": false, "description": "Profile target"}
  ]'::jsonb, 'Compile models to SQL without executing.', '["dbt", "compile", "sql", "debug"]'::jsonb),

  ('a0000000-0000-0000-0000-000000000002', 'dbt_seed', 'source', 'Load Seeds', '/dbt/seed', '[
    {"name": "project_dir", "type": "string", "required": true, "description": "Path to dbt project"},
    {"name": "select", "type": "string", "required": false, "description": "Seed selector"},
    {"name": "target", "type": "string", "required": false, "description": "Profile target"},
    {"name": "full_refresh", "type": "boolean", "required": false, "default": false}
  ]'::jsonb, 'Load CSV seed files into database.', '["dbt", "seed", "csv", "load"]'::jsonb),

  ('a0000000-0000-0000-0000-000000000002', 'dbt_freshness', 'test', 'Check Source Freshness', '/dbt/source-freshness', '[
    {"name": "project_dir", "type": "string", "required": true, "description": "Path to dbt project"},
    {"name": "select", "type": "string", "required": false, "description": "Source selector"},
    {"name": "target", "type": "string", "required": false, "description": "Profile target"}
  ]'::jsonb, 'Check if source data is fresh.', '["dbt", "freshness", "source", "monitor"]'::jsonb)
ON CONFLICT (service_id, function_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. Convenience view: join service + functions for UI queries
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

COMMENT ON VIEW public.service_functions_view IS
  'Joined view of functions + services for UI rendering. Filter by service_type for tab content.';

GRANT SELECT ON public.service_functions_view TO authenticated;
GRANT SELECT ON public.service_functions_view TO service_role;

NOTIFY pgrst, 'reload schema';

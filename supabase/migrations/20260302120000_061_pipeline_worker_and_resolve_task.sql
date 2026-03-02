-- Migration 061: Register pipeline-worker, map handled task classes, create resolve_task_endpoint()
--
-- Prerequisites: 050 (service_registry, service_functions), 059 (integration_catalog_items)
--
-- This migration:
--   1. Registers pipeline-worker as a service in service_registry
--   2. Adds an execute_task function in service_functions
--   3. Maps the 16 task_classes that pipeline-worker already handles
--   4. Creates resolve_task_endpoint() SQL function for runtime lookup

-- ---------------------------------------------------------------------------
-- 1. Register pipeline-worker service
-- ---------------------------------------------------------------------------
INSERT INTO public.service_registry (service_id, service_type, service_name, base_url, health_status, config, enabled)
VALUES (
  '00000000-0000-0000-0000-000000000100',
  'custom',
  'pipeline-worker',
  'http://localhost:8000',
  'unknown',
  '{"version": "0.1.0", "description": "Native plugin execution engine (FastAPI)"}'::jsonb,
  true
)
ON CONFLICT (service_type, service_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Add execute_task function → POST /execute
-- ---------------------------------------------------------------------------
INSERT INTO public.service_functions (
  function_id, service_id, function_name, function_type,
  label, description, entrypoint, http_method,
  parameter_schema, tags, enabled
)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000100',
  'execute_task',
  'utility',
  'Execute Task',
  'Dispatch any mapped Kestra task type to the pipeline-worker for native execution.',
  '/execute',
  'POST',
  '[
    {"name": "task_type", "type": "string", "required": true, "description": "Fully qualified Kestra task class (e.g. io.kestra.plugin.core.log.Log)"},
    {"name": "task_properties", "type": "object", "required": false, "default": {}, "description": "Task-specific properties matching the task_schema"},
    {"name": "task_id", "type": "string", "required": false, "description": "Optional caller-assigned task ID for correlation"}
  ]'::jsonb,
  '["pipeline-worker", "execute", "kestra", "native"]'::jsonb,
  true
)
ON CONFLICT (service_id, function_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Map the 16 task_classes pipeline-worker handles
-- ---------------------------------------------------------------------------
-- Core plugins (8 classes)
-- HTTP plugins (2 classes)
-- Script plugins (6 classes)

UPDATE public.integration_catalog_items
SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000101',
  mapping_notes      = 'auto-mapped: pipeline-worker handles natively'
WHERE task_class IN (
  -- Core
  'io.kestra.plugin.core.log.Log',
  'io.kestra.plugin.core.flow.Sleep',
  'io.kestra.plugin.core.flow.Pause',
  'io.kestra.plugin.core.flow.If',
  'io.kestra.plugin.core.flow.Switch',
  'io.kestra.plugin.core.flow.ForEach',
  'io.kestra.plugin.core.flow.Parallel',
  'io.kestra.plugin.core.flow.Sequential',
  -- HTTP
  'io.kestra.plugin.core.http.Request',
  'io.kestra.plugin.core.http.Download',
  -- Scripts
  'io.kestra.plugin.scripts.python.Script',
  'io.kestra.plugin.scripts.python.Commands',
  'io.kestra.plugin.scripts.shell.Script',
  'io.kestra.plugin.scripts.shell.Commands',
  'io.kestra.plugin.scripts.node.Script',
  'io.kestra.plugin.scripts.node.Commands'
)
AND mapped_function_id IS NULL;

-- ---------------------------------------------------------------------------
-- 4. resolve_task_endpoint() — runtime lookup: task_class → endpoint details
-- ---------------------------------------------------------------------------
-- Given a task_class, returns the base_url, entrypoint, http_method, and IDs
-- needed to dispatch the task to the correct service.
-- Returns 0 rows if the task_class is unmapped, disabled, or the service is offline.

CREATE OR REPLACE FUNCTION public.resolve_task_endpoint(p_task_class TEXT)
RETURNS TABLE (
  base_url          TEXT,
  entrypoint        TEXT,
  http_method       TEXT,
  service_id        UUID,
  function_id       UUID,
  parameter_schema  JSONB
) AS $$
  SELECT
    sr.base_url,
    sf.entrypoint,
    sf.http_method,
    sr.service_id,
    sf.function_id,
    sf.parameter_schema
  FROM public.integration_catalog_items ici
  JOIN public.service_functions sf ON sf.function_id = ici.mapped_function_id
  JOIN public.service_registry  sr ON sr.service_id  = sf.service_id
  WHERE ici.task_class = p_task_class
    AND ici.enabled    = true
    AND sf.enabled     = true
    AND sr.enabled     = true;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION public.resolve_task_endpoint(TEXT) IS
  'Resolve a Kestra task_class to its runtime endpoint. Returns base_url, entrypoint, http_method, service_id, function_id, parameter_schema. Empty result = unmapped or disabled.';

-- Grant execute to authenticated users (they need to resolve before dispatching)
GRANT EXECUTE ON FUNCTION public.resolve_task_endpoint(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_task_endpoint(TEXT) TO service_role;

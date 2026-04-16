-- Migration 105: parsing profile + service catalog rebaseline
--
-- Purpose:
-- - Add the missing mdast default profile without overwriting user-created rows.
-- - Repair stale service catalog truth so Platform API is advertised as the
--   active parse owner and legacy edge parse seams are marked deprecated.
--
-- Intentionally out of scope:
-- - deleting legacy rows/functions
-- - changing ingest routing policy
-- - disabling conversion-service compatibility endpoints

-- ---------------------------------------------------------------------------
-- 1. Ensure mdast has a canonical default parsing profile
-- ---------------------------------------------------------------------------

INSERT INTO public.parsing_profiles (parser, config)
SELECT
  'mdast',
  '{
    "name": "Markdown Standard",
    "description": "Markdown-native parsing through mdast with canonical markdown + AST artifacts.",
    "is_default": true,
    "artifacts": ["mdast_json", "markdown_bytes"]
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1
  FROM public.parsing_profiles
  WHERE parser = 'mdast'
    AND coalesce(config->>'name', '') = 'Markdown Standard'
);

-- ---------------------------------------------------------------------------
-- 2. Register Platform API as the active parse owner in service_registry
-- ---------------------------------------------------------------------------

INSERT INTO public.service_registry (
  service_type,
  service_name,
  base_url,
  health_status,
  config,
  enabled,
  description,
  auth_type,
  auth_config,
  docs_url,
  primary_stage,
  execution_plane
)
VALUES (
  'custom',
  'platform-api',
  'http://localhost:8000',
  'unknown',
  '{}'::jsonb,
  true,
  'Primary FastAPI backend that owns parse orchestration and conversion callback finalization.',
  'bearer',
  '{}'::jsonb,
  'http://localhost:8000/docs',
  'parse',
  'fastapi'
)
ON CONFLICT (service_type, service_name) DO UPDATE
SET base_url = EXCLUDED.base_url,
    health_status = EXCLUDED.health_status,
    config = EXCLUDED.config,
    enabled = EXCLUDED.enabled,
    description = EXCLUDED.description,
    auth_type = EXCLUDED.auth_type,
    auth_config = EXCLUDED.auth_config,
    docs_url = EXCLUDED.docs_url,
    primary_stage = EXCLUDED.primary_stage,
    execution_plane = EXCLUDED.execution_plane,
    updated_at = now();

WITH platform_api AS (
  SELECT service_id
  FROM public.service_registry
  WHERE service_type = 'custom'
    AND service_name = 'platform-api'
  LIMIT 1
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
  result_schema,
  enabled,
  tags,
  when_to_use,
  deprecated,
  beta,
  bd_stage
)
SELECT
  platform_api.service_id,
  seed.function_name,
  seed.function_type,
  seed.label,
  seed.description,
  seed.entrypoint,
  seed.http_method,
  seed.parameter_schema,
  seed.result_schema,
  true,
  seed.tags,
  seed.when_to_use,
  false,
  seed.beta,
  seed.bd_stage
FROM platform_api
JOIN (
  VALUES
    (
      'parse',
      'parse',
      'Parse Document',
      'Platform API parse orchestration entrypoint. Resolves the parser lane by source type and finalizes the active parse run.',
      '/parse',
      'POST',
      '[
        {"name":"source_uid","type":"string","required":true,"description":"Content-addressed document identifier"},
        {"name":"profile_id","type":"uuid","required":false,"description":"Optional parsing_profiles id"},
        {"name":"pipeline_config","type":"object","required":false,"description":"Optional parser-specific runtime overrides"}
      ]'::jsonb,
      '{
        "type":"object",
        "properties":{
          "ok":{"type":"boolean"},
          "source_uid":{"type":"string"},
          "conv_uid":{"type":"string"},
          "status":{"type":"string"},
          "representation_types":{"type":"array","items":{"type":"string"}}
        }
      }'::jsonb,
      '["platform-api","parse","docling","tree_sitter","mdast","pandoc"]'::jsonb,
      'Use for all active parse dispatch. This is the sole supported parse action endpoint.',
      false,
      'parse'
    ),
    (
      'conversion_callback',
      'callback',
      'Conversion Callback',
      'Platform API callback endpoint that finalizes Docling conversion artifacts and blocks into the authoritative parse state.',
      '/conversion/callback',
      'POST',
      '[
        {"name":"source_uid","type":"string","required":true},
        {"name":"conversion_job_id","type":"string","required":true},
        {"name":"md_key","type":"string","required":true},
        {"name":"success","type":"boolean","required":true},
        {"name":"docling_key","type":"string","required":false},
        {"name":"html_key","type":"string","required":false},
        {"name":"doctags_key","type":"string","required":false},
        {"name":"pipeline_config","type":"object","required":false},
        {"name":"parser_runtime_meta","type":"object","required":false},
        {"name":"blocks","type":"array","required":false},
        {"name":"conv_uid","type":"string","required":false},
        {"name":"docling_artifact_size_bytes","type":"integer","required":false},
        {"name":"error","type":"string","required":false}
      ]'::jsonb,
      '{
        "type":"object",
        "properties":{
          "ok":{"type":"boolean"},
          "source_uid":{"type":"string"},
          "conv_uid":{"type":"string"},
          "status":{"type":"string"},
          "representation_types":{"type":"array","items":{"type":"string"}}
        }
      }'::jsonb,
      '["platform-api","callback","docling","parse"]'::jsonb,
      'Use only for Docling conversion completion into Platform API-owned parse state.',
      false,
      'orchestration'
    )
) AS seed(
  function_name,
  function_type,
  label,
  description,
  entrypoint,
  http_method,
  parameter_schema,
  result_schema,
  tags,
  when_to_use,
  beta,
  bd_stage
) ON TRUE
ON CONFLICT (service_id, function_name) DO UPDATE
SET function_type = EXCLUDED.function_type,
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    entrypoint = EXCLUDED.entrypoint,
    http_method = EXCLUDED.http_method,
    parameter_schema = EXCLUDED.parameter_schema,
    result_schema = EXCLUDED.result_schema,
    enabled = EXCLUDED.enabled,
    tags = EXCLUDED.tags,
    when_to_use = EXCLUDED.when_to_use,
    deprecated = EXCLUDED.deprecated,
    beta = EXCLUDED.beta,
    bd_stage = EXCLUDED.bd_stage,
    updated_at = now();

-- ---------------------------------------------------------------------------
-- 3. Mark legacy parse edge seams as deprecated in the service catalog
-- ---------------------------------------------------------------------------

UPDATE public.service_functions
SET deprecated = true,
    when_to_use = 'Legacy compatibility only. Active parse ownership now lives in Platform API.',
    updated_at = now()
WHERE function_name IN ('trigger-parse', 'conversion-complete');

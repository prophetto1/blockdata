-- Migration 053: unified service registry fixes + conversion-service seed
-- Purpose:
-- - Fix service_runs RLS to align with public.projects(owner_id).
-- - Register conversion-service (FastAPI) in the unified service registry.
-- - Seed callable conversion functions (docling/pandoc/mdast) + citations.

-- ---------------------------------------------------------------------------
-- 1. Fix RLS policies: service_runs should scope by projects.owner_id
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS service_runs_select ON public.service_runs;
CREATE POLICY service_runs_select
  ON public.service_runs FOR SELECT TO authenticated
  USING (
    project_id IS NULL
    OR project_id IN (
      SELECT p.project_id FROM public.projects p WHERE p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS service_runs_insert ON public.service_runs;
CREATE POLICY service_runs_insert
  ON public.service_runs FOR INSERT TO authenticated
  WITH CHECK (
    project_id IS NULL
    OR project_id IN (
      SELECT p.project_id FROM public.projects p WHERE p.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Seed: conversion-service runtime (FastAPI)
-- ---------------------------------------------------------------------------
INSERT INTO public.service_registry (service_type, service_name, base_url, config)
VALUES
  (
    'conversion',
    'conversion-service',
    'http://localhost:5002',
    '{
      "version":"0.1.0",
      "auth_header":"X-Conversion-Service-Key",
      "execution_mode":"async_callback"
    }'::jsonb
  )
ON CONFLICT (service_type, service_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Seed: conversion endpoints as callable functions
-- ---------------------------------------------------------------------------
WITH conv AS (
  SELECT sr.service_id
  FROM public.service_registry sr
  WHERE sr.service_type = 'conversion'
    AND sr.service_name = 'conversion-service'
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
  tags
)
SELECT
  conv.service_id,
  seed.function_name,
  seed.function_type,
  seed.label,
  seed.description,
  seed.entrypoint,
  seed.http_method,
  seed.parameter_schema,
  seed.tags
FROM conv
JOIN (
  VALUES
    (
      'convert_docling',
      'convert',
      'Convert (Docling)',
      'Convert non-Markdown uploads via Docling track (docx/pdf/pptx/xlsx/html/csv) to markdown + optional Docling/Pandoc/HTML exports.',
      '/convert',
      'POST',
      '[
        {"name":"track","type":"enum","required":true,"default":"docling","values":["docling","pandoc","mdast"],"ui_hidden":true},
        {"name":"source_type","type":"enum","required":true,"values":["docx","pdf","pptx","xlsx","html","csv"],"description":"Source file type"},
        {"name":"source_download_url","type":"string","required":true,"description":"Signed URL to download source bytes"},
        {"name":"callback_url","type":"string","required":true,"description":"Edge callback URL (conversion-complete)"},
        {"name":"export_markdown","type":"boolean","required":false,"default":true},
        {"name":"export_docling_json","type":"boolean","required":false,"default":true},
        {"name":"export_pandoc_ast_json","type":"boolean","required":false,"default":false},
        {"name":"export_html","type":"boolean","required":false,"default":false},
        {"name":"export_doctags","type":"boolean","required":false,"default":false}
      ]'::jsonb,
      '["conversion-service","convert","docling","parse","ingest"]'::jsonb
    ),
    (
      'convert_pandoc',
      'convert',
      'Convert (Pandoc)',
      'Convert non-Markdown uploads via Pandoc track (rst/latex/odt/epub/rtf/org) to markdown + optional Pandoc AST.',
      '/convert',
      'POST',
      '[
        {"name":"track","type":"enum","required":true,"default":"pandoc","values":["docling","pandoc","mdast"],"ui_hidden":true},
        {"name":"source_type","type":"enum","required":true,"values":["rst","latex","odt","epub","rtf","org","tex"],"description":"Source file type"},
        {"name":"source_download_url","type":"string","required":true,"description":"Signed URL to download source bytes"},
        {"name":"callback_url","type":"string","required":true,"description":"Edge callback URL (conversion-complete)"},
        {"name":"export_markdown","type":"boolean","required":false,"default":true},
        {"name":"export_pandoc_ast_json","type":"boolean","required":false,"default":true},
        {"name":"export_docling_json","type":"boolean","required":false,"default":false}
      ]'::jsonb,
      '["conversion-service","convert","pandoc","parse","ingest"]'::jsonb
    ),
    (
      'convert_mdast',
      'convert',
      'Convert (mdast / Remark)',
      'Convert plain text uploads (txt) via mdast (remark) track to markdown bytes + optional supplemental parser artifacts.',
      '/convert',
      'POST',
      '[
        {"name":"track","type":"enum","required":true,"default":"mdast","values":["docling","pandoc","mdast"],"ui_hidden":true},
        {"name":"source_type","type":"enum","required":true,"values":["txt"],"description":"Source file type"},
        {"name":"source_download_url","type":"string","required":true,"description":"Signed URL to download source bytes"},
        {"name":"callback_url","type":"string","required":true,"description":"Edge callback URL (conversion-complete)"},
        {"name":"export_markdown","type":"boolean","required":false,"default":true},
        {"name":"export_pandoc_ast_json","type":"boolean","required":false,"default":false},
        {"name":"export_docling_json","type":"boolean","required":false,"default":false}
      ]'::jsonb,
      '["conversion-service","convert","mdast","remark","parse","ingest"]'::jsonb
    ),
    (
      'citations',
      'utility',
      'Extract Citations',
      'Extract legal citations from text via the conversion-service citations endpoint (eyecite).',
      '/citations',
      'POST',
      '[
        {"name":"text","type":"string","required":true,"description":"Input text to analyze"},
        {"name":"format","type":"enum","required":false,"default":"eyecite","values":["eyecite"],"description":"Extraction backend"}
      ]'::jsonb,
      '["conversion-service","citations","eyecite","utility"]'::jsonb
    )
) AS seed(
  function_name,
  function_type,
  label,
  description,
  entrypoint,
  http_method,
  parameter_schema,
  tags
) ON TRUE
ON CONFLICT (service_id, function_name) DO NOTHING;

NOTIFY pgrst, 'reload schema';

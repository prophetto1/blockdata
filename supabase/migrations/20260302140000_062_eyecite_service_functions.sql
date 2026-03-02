-- Migration 062: Register eyecite as a service with 5 functions
-- eyecite is a Python library for legal citation extraction (Free Law Project).
-- Runs on the pipeline-worker FastAPI service via plugin dispatch.

-- 1. Register the eyecite service under pipeline-worker
INSERT INTO public.service_registry (service_id, service_type, service_name, base_url, config, health_status)
VALUES (
  'a0000000-0000-0000-0000-000000000010',
  'custom',
  'eyecite',
  'http://localhost:8000',
  '{"version":"2.6.2","library":"eyecite","description":"Legal citation extraction, resolution, and annotation"}'::jsonb,
  'unknown'
)
ON CONFLICT (service_type, service_name) DO UPDATE SET
  base_url = EXCLUDED.base_url,
  config = EXCLUDED.config,
  updated_at = now();

-- 2. Register service functions (5 endpoints)
-- Each function has its own URL: POST /{function_name}

-- 2a. Clean text
INSERT INTO public.service_functions (
  service_id, function_name, function_type, label, description,
  entrypoint, http_method, parameter_schema, tags
) VALUES (
  'a0000000-0000-0000-0000-000000000010',
  'eyecite_clean',
  'utility',
  'Clean Text',
  'Pre-process raw text before citation extraction. Strips HTML, normalizes whitespace, removes PDF artifacts.',
  '/eyecite_clean',
  'POST',
  '[
    {"name":"text","type":"string","required":true,"description":"Raw input text (may contain HTML)."},
    {"name":"steps","type":"json","required":false,"default":["html","inline_whitespace"],"description":"Ordered list of cleaner names: html, inline_whitespace, all_whitespace, underscores, xml."}
  ]'::jsonb,
  '["eyecite","citation","clean","utility"]'::jsonb
)
ON CONFLICT (service_id, function_name) DO UPDATE SET
  parameter_schema = EXCLUDED.parameter_schema,
  description = EXCLUDED.description,
  updated_at = now();

-- 2b. Extract citations
INSERT INTO public.service_functions (
  service_id, function_name, function_type, label, description,
  entrypoint, http_method, parameter_schema, tags
) VALUES (
  'a0000000-0000-0000-0000-000000000010',
  'eyecite_extract',
  'utility',
  'Extract Citations',
  'Extract all legal citations from text. Finds case, law, journal, short-form, supra, id, and reference citations.',
  '/eyecite_extract',
  'POST',
  '[
    {"name":"text","type":"string","required":true,"description":"Plain text to extract citations from."},
    {"name":"markup_text","type":"string","required":false,"description":"Original HTML/XML for markup-aware extraction."},
    {"name":"clean_steps","type":"json","required":false,"description":"Cleaning steps to apply before extraction."},
    {"name":"remove_ambiguous","type":"boolean","required":false,"default":false,"description":"Drop citations with ambiguous reporters."},
    {"name":"resolve","type":"boolean","required":false,"default":false,"description":"Also resolve citations after extraction."}
  ]'::jsonb,
  '["eyecite","citation","extract","legal"]'::jsonb
)
ON CONFLICT (service_id, function_name) DO UPDATE SET
  parameter_schema = EXCLUDED.parameter_schema,
  description = EXCLUDED.description,
  updated_at = now();

-- 2c. Resolve citations
INSERT INTO public.service_functions (
  service_id, function_name, function_type, label, description,
  entrypoint, http_method, parameter_schema, tags
) VALUES (
  'a0000000-0000-0000-0000-000000000010',
  'eyecite_resolve',
  'utility',
  'Resolve Citations',
  'Link short-form, supra, id, and reference citations back to their full citation. Groups all references to the same case.',
  '/eyecite_resolve',
  'POST',
  '[
    {"name":"text","type":"string","required":true,"description":"Text containing citations to resolve."},
    {"name":"clean_steps","type":"json","required":false,"description":"Cleaning steps to apply before extraction."}
  ]'::jsonb,
  '["eyecite","citation","resolve","legal"]'::jsonb
)
ON CONFLICT (service_id, function_name) DO UPDATE SET
  parameter_schema = EXCLUDED.parameter_schema,
  description = EXCLUDED.description,
  updated_at = now();

-- 2d. Annotate citations
INSERT INTO public.service_functions (
  service_id, function_name, function_type, label, description,
  entrypoint, http_method, parameter_schema, tags
) VALUES (
  'a0000000-0000-0000-0000-000000000010',
  'eyecite_annotate',
  'utility',
  'Annotate Citations',
  'Insert HTML markup around citation spans. Supports source-text offset translation for annotating original HTML.',
  '/execute',
  'POST',
  '[
    {"name":"text","type":"string","required":true,"description":"Plain text to annotate."},
    {"name":"source_text","type":"string","required":false,"description":"Original HTML — annotations land in correct positions via diff."},
    {"name":"before_tag","type":"string","required":false,"default":"<span class=\"citation\">","description":"HTML inserted before each citation."},
    {"name":"after_tag","type":"string","required":false,"default":"</span>","description":"HTML inserted after each citation."},
    {"name":"unbalanced_tags","type":"enum","required":false,"default":"skip","values":["unchecked","skip","wrap"],"description":"How to handle unbalanced HTML tags."},
    {"name":"clean_steps","type":"json","required":false,"description":"Cleaning steps to apply before extraction."}
  ]'::jsonb,
  '["eyecite","citation","annotate","legal"]'::jsonb
)
ON CONFLICT (service_id, function_name) DO UPDATE SET
  parameter_schema = EXCLUDED.parameter_schema,
  description = EXCLUDED.description,
  updated_at = now();

-- 2e. Full pipeline
INSERT INTO public.service_functions (
  service_id, function_name, function_type, label, description,
  entrypoint, http_method, parameter_schema, tags
) VALUES (
  'a0000000-0000-0000-0000-000000000010',
  'eyecite_pipeline',
  'utility',
  'Citation Pipeline',
  'Full eyecite pipeline: clean → extract → resolve → annotate. Configurable output format.',
  '/execute',
  'POST',
  '[
    {"name":"text","type":"string","required":true,"description":"Raw text (may contain HTML)."},
    {"name":"clean_steps","type":"json","required":false,"default":["html","inline_whitespace"],"description":"Cleaning pipeline."},
    {"name":"remove_ambiguous","type":"boolean","required":false,"default":false,"description":"Drop ambiguous reporter citations."},
    {"name":"annotate","type":"boolean","required":false,"default":false,"description":"Return annotated text with citation markup."},
    {"name":"before_tag","type":"string","required":false,"default":"<span class=\"citation\">","description":"HTML before each citation (when annotate=true)."},
    {"name":"after_tag","type":"string","required":false,"default":"</span>","description":"HTML after each citation (when annotate=true)."},
    {"name":"output_format","type":"enum","required":false,"default":"full","values":["full","citations_only","resolved_only","annotated_only"],"description":"What to include in the response."}
  ]'::jsonb,
  '["eyecite","citation","pipeline","legal"]'::jsonb
)
ON CONFLICT (service_id, function_name) DO UPDATE SET
  parameter_schema = EXCLUDED.parameter_schema,
  description = EXCLUDED.description,
  updated_at = now();

-- Migration 081: Docling-only parsing
-- Remove pandoc and mdast tracks. Docling is the sole parser for all formats.

-- =========================================================================
-- 1. Delete stale non-docling parsed data (blocks, representations, parsing)
-- =========================================================================

-- Delete overlays for runs tied to non-docling conversions
DELETE FROM public.block_overlays_v2
  WHERE run_id IN (
    SELECT run_id FROM public.runs_v2
    WHERE conv_uid IN (
      SELECT conv_uid FROM public.conversion_parsing WHERE conv_parsing_tool != 'docling'
    )
  );

-- Delete runs tied to non-docling conversions
DELETE FROM public.runs_v2
  WHERE conv_uid IN (
    SELECT conv_uid FROM public.conversion_parsing WHERE conv_parsing_tool != 'docling'
  );

-- Delete blocks tied to non-docling conversions
DELETE FROM public.blocks WHERE conv_uid IN (
  SELECT conv_uid FROM public.conversion_parsing WHERE conv_parsing_tool != 'docling'
);

DELETE FROM public.conversion_representations WHERE parsing_tool != 'docling';

DELETE FROM public.conversion_parsing WHERE conv_parsing_tool != 'docling';

-- Reset documents that lost their parsing data back to 'uploaded' for re-parse.
UPDATE public.source_documents SET status = 'uploaded', error = NULL
WHERE status = 'ingested' AND source_uid NOT IN (
  SELECT source_uid FROM public.conversion_parsing
);

-- =========================================================================
-- 2. Relax conversion_representations constraints to Docling-only
-- =========================================================================

ALTER TABLE public.conversion_representations
  DROP CONSTRAINT IF EXISTS conversion_representations_pairing;

ALTER TABLE public.conversion_representations
  ADD CONSTRAINT conversion_representations_pairing CHECK (
    parsing_tool = 'docling' AND representation_type IN (
      'markdown_bytes', 'doclingdocument_json', 'html_bytes', 'doctags_text', 'citations_json'
    )
  );

-- Replace the original parsing_tool check to only allow 'docling'.
ALTER TABLE public.conversion_representations
  DROP CONSTRAINT IF EXISTS conversion_representations_v2_parsing_tool_check;

ALTER TABLE public.conversion_representations
  ADD CONSTRAINT conversion_representations_v2_parsing_tool_check
  CHECK (parsing_tool = 'docling');

-- =========================================================================
-- 3. Update admin_runtime_policy rows to Docling-only values
-- =========================================================================

UPDATE public.admin_runtime_policy
SET value_jsonb = '{"docling": true}'::jsonb,
    updated_at = now()
WHERE policy_key = 'upload.track_enabled';

UPDATE public.admin_runtime_policy
SET value_jsonb = '{
  "md": "docling", "markdown": "docling", "txt": "docling",
  "docx": "docling", "pdf": "docling", "pptx": "docling",
  "xlsx": "docling", "html": "docling", "htm": "docling",
  "csv": "docling", "rst": "docling", "tex": "docling",
  "latex": "docling", "odt": "docling", "epub": "docling",
  "rtf": "docling", "org": "docling"
}'::jsonb,
    updated_at = now()
WHERE policy_key = 'upload.extension_track_routing';

UPDATE public.admin_runtime_policy
SET value_jsonb = jsonb_build_object(
  'version', '2026-03-13',
  'tracks', jsonb_build_object(
    'docling', jsonb_build_object(
      'extensions', '["md","markdown","txt","docx","pdf","pptx","xlsx","html","htm","csv","rst","tex","latex","odt","epub","rtf","org"]'::jsonb
    )
  )
),
    updated_at = now()
WHERE policy_key = 'upload.track_capability_catalog';

UPDATE public.admin_runtime_policy
SET value_jsonb = jsonb_build_object(
  'docling', '["md","markdown","txt","docx","pdf","pptx","xlsx","html","csv","rst","latex","odt","epub","rtf","org"]'::jsonb
),
    updated_at = now()
WHERE policy_key = 'upload.parser_artifact_source_types';

-- Update allowed_extensions to include all formats.
UPDATE public.admin_runtime_policy
SET value_jsonb = '["md","markdown","txt","docx","pdf","pptx","xlsx","html","htm","csv","rst","tex","latex","odt","epub","rtf","org"]'::jsonb,
    updated_at = now()
WHERE policy_key = 'upload.allowed_extensions';

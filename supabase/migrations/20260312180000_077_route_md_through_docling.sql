-- Route md/markdown/txt through docling instead of mdast.
-- All file types now go through the Docling conversion service for consistent
-- DoclingDocument JSON + markdown export output.

-- 1) Update extension_track_routing: md/markdown/txt → docling
UPDATE public.admin_runtime_policy
SET value_jsonb = value_jsonb || '{"md":"docling","markdown":"docling","txt":"docling"}'::jsonb
WHERE policy_key = 'upload.extension_track_routing';

-- 2) Update track_capability_catalog: add md/markdown/txt to docling extensions
UPDATE public.admin_runtime_policy
SET value_jsonb = jsonb_set(
  value_jsonb,
  '{tracks,docling,extensions}',
  '["md","markdown","txt","docx","pdf","pptx","xlsx","html","htm","csv"]'::jsonb
)
WHERE policy_key = 'upload.track_capability_catalog';

-- 3) Update parser_artifact_source_types: add md/markdown/txt to docling list
UPDATE public.admin_runtime_policy
SET value_jsonb = jsonb_set(
  value_jsonb,
  '{docling}',
  '["md","markdown","txt","docx","pdf","pptx","xlsx","html","csv"]'::jsonb
)
WHERE policy_key = 'upload.parser_artifact_source_types';

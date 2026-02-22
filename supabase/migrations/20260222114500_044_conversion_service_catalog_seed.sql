-- Migration 044: seed conversion service catalog with existing tracks
-- Purpose:
-- - Register all currently implemented conversion tracks.

INSERT INTO public.conversion_service_catalog (
  track,
  service_name,
  entrypoint,
  source_types,
  primary_representation_type,
  supplemental_representation_types,
  notes
)
VALUES
  (
    'mdast',
    'conversion-service',
    '/convert',
    '["txt"]'::jsonb,
    'markdown_bytes',
    '["doclingdocument_json","pandoc_ast_json"]'::jsonb,
    'mdast conversion path currently handles txt source_type.'
  ),
  (
    'docling',
    'conversion-service',
    '/convert',
    '["docx","pdf","pptx","xlsx","html","csv"]'::jsonb,
    'doclingdocument_json',
    '["markdown_bytes","pandoc_ast_json","html_bytes","doctags_text"]'::jsonb,
    'Docling conversion path with optional supplemental exports.'
  ),
  (
    'pandoc',
    'conversion-service',
    '/convert',
    '["docx","html","txt","rst","latex","odt","epub","rtf","org"]'::jsonb,
    'pandoc_ast_json',
    '["markdown_bytes","doclingdocument_json"]'::jsonb,
    'Pandoc conversion path with optional supplemental docling JSON.'
  )
ON CONFLICT (track) DO UPDATE
SET
  service_name = EXCLUDED.service_name,
  entrypoint = EXCLUDED.entrypoint,
  source_types = EXCLUDED.source_types,
  primary_representation_type = EXCLUDED.primary_representation_type,
  supplemental_representation_types = EXCLUDED.supplemental_representation_types,
  notes = EXCLUDED.notes,
  updated_at = now();

NOTIFY pgrst, 'reload schema';

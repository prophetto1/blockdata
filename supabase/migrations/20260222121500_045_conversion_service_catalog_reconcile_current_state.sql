-- Migration 045: reconcile conversion service catalog with current runtime state
-- Purpose:
-- - Align catalog rows to current effective ingest routing + conversion behavior.

UPDATE public.conversion_service_catalog
SET
  source_types = '["txt"]'::jsonb,
  supplemental_representation_types = '["pandoc_ast_json"]'::jsonb,
  notes = 'Resolved track=mdast in /convert currently handles txt only. md uploads are parsed inline in ingest (processMarkdown) and are not sent to /convert.',
  updated_at = now()
WHERE track = 'mdast';

UPDATE public.conversion_service_catalog
SET
  source_types = '["docx","pdf","pptx","xlsx","html","csv"]'::jsonb,
  supplemental_representation_types = '["markdown_bytes","pandoc_ast_json","html_bytes","doctags_text"]'::jsonb,
  notes = 'Effective routed source_types for docling track. htm extension is normalized to html source_type before conversion.',
  updated_at = now()
WHERE track = 'docling';

UPDATE public.conversion_service_catalog
SET
  source_types = '["rst","latex","odt","epub","rtf","org"]'::jsonb,
  supplemental_representation_types = '["markdown_bytes"]'::jsonb,
  notes = 'Effective routed source_types for pandoc track under current runtime routing. tex extension is normalized to latex source_type.',
  updated_at = now()
WHERE track = 'pandoc';

NOTIFY pgrst, 'reload schema';

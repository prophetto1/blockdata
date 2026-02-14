-- Migration 025: make parser artifact capability superadmin-configurable
--
-- Adds policy key used by ingest/process-convert to decide which source_type
-- values should receive docling/pandoc artifact upload targets.

INSERT INTO public.admin_runtime_policy (policy_key, value_jsonb, value_type, description)
VALUES
  (
    'upload.parser_artifact_source_types',
    '{
      "docling":["docx","pdf","pptx","xlsx","html","csv"],
      "pandoc":["docx","html","txt","rst","latex","odt","epub","rtf","org"]
    }'::jsonb,
    'object',
    'Source types eligible for parser artifact upload targets (docling/pandoc) during conversion.'
  )
ON CONFLICT (policy_key) DO NOTHING;

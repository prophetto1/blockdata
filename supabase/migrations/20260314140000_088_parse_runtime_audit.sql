-- Add parse runtime audit columns so the platform can record what
-- the conversion service was asked to do vs what it actually did.

ALTER TABLE public.conversion_parsing
  ADD COLUMN IF NOT EXISTS requested_pipeline_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS applied_pipeline_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS parser_runtime_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill: copy existing pipeline_config into the new requested/applied columns
-- so that already-parsed documents have consistent data.
UPDATE public.conversion_parsing
SET
  requested_pipeline_config = COALESCE(pipeline_config, '{}'::jsonb),
  applied_pipeline_config = COALESCE(pipeline_config, '{}'::jsonb)
WHERE requested_pipeline_config = '{}'::jsonb
  AND pipeline_config IS NOT NULL
  AND pipeline_config != '{}'::jsonb;

-- Recreate view_documents to expose the new columns.
-- This must match the column list from migration _084_ plus the three new columns.
CREATE OR REPLACE VIEW public.view_documents AS
SELECT
  sd.source_uid,
  sd.owner_id,
  sd.source_type,
  sd.source_filesize,
  sd.source_total_characters,
  sd.source_locator,
  sd.doc_title,
  sd.uploaded_at,
  sd.updated_at,
  sd.status,
  sd.error,
  sd.conversion_job_id,
  sd.project_id,
  cp.conv_uid,
  cp.conv_status,
  cp.conv_parsing_tool,
  cp.conv_representation_type,
  cp.conv_total_blocks,
  cp.conv_block_type_freq,
  cp.conv_total_characters,
  cp.conv_locator,
  cp.pipeline_config,
  cp.requested_pipeline_config,
  cp.applied_pipeline_config,
  cp.parser_runtime_meta
FROM public.source_documents sd
LEFT JOIN public.conversion_parsing cp ON cp.source_uid = sd.source_uid;

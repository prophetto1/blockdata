-- Migration 036: Add explicit step timestamp columns for enriching and extracting
-- Fixes: step_embedded_at was being overloaded for enriching status.
-- Worker code now writes step_enriched_at and step_extracted_at explicitly.

-- 1) Rename step_embedded_at -> step_enriched_at (enriching came before embedding in pipeline)
ALTER TABLE public.unstructured_run_docs_v2
  RENAME COLUMN step_embedded_at TO step_enriched_at;

-- 2) Add step_extracted_at for extract flow
ALTER TABLE public.unstructured_run_docs_v2
  ADD COLUMN IF NOT EXISTS step_extracted_at TIMESTAMPTZ;

-- 3) Add step_embedded_at back as a distinct column for future embedding status
ALTER TABLE public.unstructured_run_docs_v2
  ADD COLUMN IF NOT EXISTS step_embedded_at TIMESTAMPTZ;
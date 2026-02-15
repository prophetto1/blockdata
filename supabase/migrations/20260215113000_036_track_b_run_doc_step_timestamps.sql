-- Migration 036: Track B run-doc step timestamp clarity

ALTER TABLE public.unstructured_run_docs_v2
  ADD COLUMN IF NOT EXISTS step_enriched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS step_extracted_at TIMESTAMPTZ;

-- Backfill enriched timestamp from historical embedded timestamp where available.
UPDATE public.unstructured_run_docs_v2
SET step_enriched_at = step_embedded_at
WHERE step_enriched_at IS NULL
  AND step_embedded_at IS NOT NULL;

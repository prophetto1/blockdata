-- Migration 083: Rename status values for clarity.
-- ingested → parsed, ingest_failed → parse_failed.
-- These terms match what the UI shows and what users understand.

-- Add new status values to lookup table
INSERT INTO public.status_document_uploads (status, sort_order)
VALUES ('parsed', 3), ('parse_failed', 5)
ON CONFLICT (status) DO NOTHING;

-- Update documents
UPDATE public.source_documents SET status = 'parsed' WHERE status = 'ingested';
UPDATE public.source_documents SET status = 'parse_failed' WHERE status = 'ingest_failed';

-- Remove old values
DELETE FROM public.status_document_uploads WHERE status IN ('ingested', 'ingest_failed');

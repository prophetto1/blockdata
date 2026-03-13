-- Migration 079: expand storage SELECT policy to allow access to all
-- conversion_representations artifact_locator paths, not just the single
-- conv_locator in conversion_parsing.
--
-- The previous policy (040) only authorised signed-URL access for:
--   1. source_documents.source_locator   (original upload)
--   2. conversion_parsing.conv_locator   (primary conversion artifact)
--
-- For docling-track documents conv_locator points to the DoclingDocument JSON,
-- but the markdown, HTML, and doctags artifacts live at different storage keys
-- recorded in conversion_representations.artifact_locator.  Without this
-- change, createSignedUrl() returns 400 for any supplemental representation.

DROP POLICY IF EXISTS storage_objects_documents_select_owned ON storage.objects;
CREATE POLICY storage_objects_documents_select_owned
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    -- original uploaded file
    EXISTS (
      SELECT 1
      FROM public.source_documents sd
      WHERE sd.owner_id = auth.uid()
        AND sd.source_locator = storage.objects.name
    )
    -- primary conversion artifact
    OR EXISTS (
      SELECT 1
      FROM public.conversion_parsing cp
      JOIN public.source_documents sd ON sd.source_uid = cp.source_uid
      WHERE sd.owner_id = auth.uid()
        AND cp.conv_locator = storage.objects.name
    )
    -- any supplemental representation artifact (markdown, html, doctags, etc.)
    OR EXISTS (
      SELECT 1
      FROM public.conversion_representations cr
      JOIN public.source_documents sd ON sd.source_uid = cr.source_uid
      WHERE sd.owner_id = auth.uid()
        AND cr.artifact_locator = storage.objects.name
    )
  )
);

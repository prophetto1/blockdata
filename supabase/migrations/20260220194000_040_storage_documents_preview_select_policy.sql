-- Migration 040: allow authenticated users to preview their own documents bucket objects.
-- Needed for client-side createSignedUrl() used by in-app document preview.

GRANT SELECT ON storage.objects TO authenticated;

DROP POLICY IF EXISTS storage_objects_documents_select_owned ON storage.objects;
CREATE POLICY storage_objects_documents_select_owned
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    EXISTS (
      SELECT 1
      FROM public.source_documents sd
      WHERE sd.owner_id = auth.uid()
        AND sd.source_locator = storage.objects.name
    )
    OR EXISTS (
      SELECT 1
      FROM public.conversion_parsing cp
      JOIN public.source_documents sd ON sd.source_uid = cp.source_uid
      WHERE sd.owner_id = auth.uid()
        AND cp.conv_locator = storage.objects.name
    )
  )
);

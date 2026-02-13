-- Migration 020: allow new pandoc source MIME types in documents bucket

DO $$
DECLARE
  extra_mimes text[] := ARRAY[
    'text/x-rst',
    'application/x-tex',
    'application/vnd.oasis.opendocument.text',
    'application/epub+zip',
    'application/rtf'
  ];
BEGIN
  UPDATE storage.buckets b
  SET allowed_mime_types = (
    SELECT ARRAY(
      SELECT DISTINCT m
      FROM unnest(COALESCE(b.allowed_mime_types, ARRAY[]::text[]) || extra_mimes) AS t(m)
      ORDER BY m
    )
  )
  WHERE b.id = 'documents';
END $$;


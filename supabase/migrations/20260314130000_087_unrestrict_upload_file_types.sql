-- Upload support is intentionally decoupled from parse support.
-- Any file type may be stored; parse eligibility is decided later by
-- parser capability metadata and the parser service itself.

-- 1. Remove MIME allowlist from the documents bucket so generic uploads
--    (including application/octet-stream) are not rejected at storage time.
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'documents';

-- 2. Add 'binary' to the source_type CHECK constraint so unknown file
--    types that fall through detectSourceTypeForUpload can be inserted.
ALTER TABLE public.documents_v2
  DROP CONSTRAINT IF EXISTS documents_v2_source_type_check;

ALTER TABLE public.documents_v2
  ADD CONSTRAINT documents_v2_source_type_check
  CHECK (source_type IN (
    'md', 'txt', 'docx', 'pptx', 'pdf', 'html', 'image',
    'asciidoc', 'csv', 'xlsx', 'xml_uspto', 'xml_jats',
    'mets_gbs', 'json_docling', 'audio', 'vtt',
    'rst', 'latex', 'odt', 'epub', 'rtf', 'org',
    'binary'
  ));

-- 3. Remove the old upload extension allowlist from runtime policy.
--    Uploads are no longer gated by extension membership.
DELETE FROM public.admin_runtime_policy
WHERE policy_key = 'upload.allowed_extensions';

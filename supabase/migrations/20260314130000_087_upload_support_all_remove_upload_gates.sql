-- Upload support is intentionally decoupled from parse support.
-- Any file type may be stored; parse eligibility is decided later by
-- parser capability metadata and the parser service itself.

-- 1. Remove MIME allowlist from the documents bucket so generic uploads
--    (including application/octet-stream) are not rejected at storage time.
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'documents';

-- 2. Remove the old upload extension allowlist from runtime policy.
--    Uploads are no longer gated by extension membership.
DELETE FROM public.admin_runtime_policy
WHERE policy_key = 'upload.allowed_extensions';

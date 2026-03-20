-- Migration 20260320100000: Repair schema drift caused by duplicate timestamp migrations.
--
-- Supabase tracks history by version only, so duplicate-timestamp siblings were collapsed
-- in history. This migration re-applies the intent of skipped siblings safely.

-- 1) Repair parsing_profiles schema/RLS drift (from collapsed 099_parsing_profiles_rls.sql)
ALTER TABLE public.parsing_profiles
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP POLICY IF EXISTS parsing_profiles_select ON public.parsing_profiles;
DROP POLICY IF EXISTS parsing_profiles_insert ON public.parsing_profiles;
DROP POLICY IF EXISTS parsing_profiles_update ON public.parsing_profiles;
DROP POLICY IF EXISTS parsing_profiles_delete ON public.parsing_profiles;

CREATE POLICY parsing_profiles_select
  ON public.parsing_profiles
  FOR SELECT
  USING (true);

CREATE POLICY parsing_profiles_insert
  ON public.parsing_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY parsing_profiles_update
  ON public.parsing_profiles
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY parsing_profiles_delete
  ON public.parsing_profiles
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Keep parsing_profiles owned by users protected by RLS
ALTER TABLE public.parsing_profiles ENABLE ROW LEVEL SECURITY;

-- 2) Repair upload-gate drift from collapsed 087 migrations (idempotent)
DO $$
BEGIN
  -- Make documents bucket permissive (expected state in 087 migrations).
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    UPDATE storage.buckets
    SET allowed_mime_types = NULL
    WHERE id = 'documents';
  END IF;

  -- Remove upload extension allowlist policy if it exists.
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_runtime_policy') THEN
    DELETE FROM public.admin_runtime_policy
    WHERE policy_key = 'upload.allowed_extensions';
  END IF;

  -- Re-add the 'binary' source_type value if documents_v2 exists and constraint is present/missing.
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'documents_v2'
  ) THEN
    ALTER TABLE public.documents_v2 DROP CONSTRAINT IF EXISTS documents_v2_source_type_check;
    ALTER TABLE public.documents_v2
      ADD CONSTRAINT documents_v2_source_type_check
      CHECK (
        source_type IN (
          'md', 'txt', 'docx', 'pptx', 'pdf', 'html', 'image',
          'asciidoc', 'csv', 'xlsx', 'xml_uspto', 'xml_jats',
          'mets_gbs', 'json_docling', 'audio', 'vtt',
          'rst', 'latex', 'odt', 'epub', 'rtf', 'org',
          'binary'
        )
      );
  END IF;
END;
$$;

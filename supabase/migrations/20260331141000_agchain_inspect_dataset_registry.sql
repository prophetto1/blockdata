CREATE TABLE IF NOT EXISTS public.agchain_datasets (
  dataset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tags_jsonb JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  source_type TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_datasets_project_slug_unique UNIQUE (project_id, slug),
  CONSTRAINT agchain_datasets_status_check CHECK (
    status IN ('active', 'archived')
  ),
  CONSTRAINT agchain_datasets_source_type_check CHECK (
    source_type IN ('csv', 'json', 'jsonl', 'huggingface')
  )
);

CREATE TABLE IF NOT EXISTS public.agchain_dataset_versions (
  dataset_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.agchain_datasets(dataset_id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  base_version_id UUID NULL REFERENCES public.agchain_dataset_versions(dataset_version_id) ON DELETE SET NULL,
  source_type TEXT NOT NULL,
  source_uri TEXT NULL,
  source_config_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  field_spec_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  materialization_options_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  parse_summary_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_summary_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  sample_count INTEGER NOT NULL DEFAULT 0,
  checksum TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_dataset_versions_dataset_version_label_unique UNIQUE (dataset_id, version_label),
  CONSTRAINT agchain_dataset_versions_source_type_check CHECK (
    source_type IN ('csv', 'json', 'jsonl', 'huggingface')
  )
);

CREATE TABLE IF NOT EXISTS public.agchain_dataset_version_drafts (
  draft_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.agchain_datasets(dataset_id) ON DELETE CASCADE,
  base_version_id UUID NULL REFERENCES public.agchain_dataset_versions(dataset_version_id) ON DELETE SET NULL,
  version_label TEXT NULL,
  source_config_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  field_spec_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  materialization_options_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_summary_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_summary_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  dirty_state_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  draft_status TEXT NOT NULL DEFAULT 'open',
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_dataset_version_drafts_status_check CHECK (
    draft_status IN ('open', 'committed', 'expired')
  )
);

CREATE TABLE IF NOT EXISTS public.agchain_dataset_samples (
  dataset_sample_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version_id UUID NOT NULL REFERENCES public.agchain_dataset_versions(dataset_version_id) ON DELETE CASCADE,
  sample_id TEXT NOT NULL,
  canonical_sample_jsonb JSONB NOT NULL,
  summary_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  has_setup BOOLEAN NOT NULL DEFAULT false,
  has_sandbox BOOLEAN NOT NULL DEFAULT false,
  has_files BOOLEAN NOT NULL DEFAULT false,
  parse_status TEXT NOT NULL DEFAULT 'ok',
  CONSTRAINT agchain_dataset_samples_dataset_version_sample_id_unique UNIQUE (dataset_version_id, sample_id),
  CONSTRAINT agchain_dataset_samples_parse_status_check CHECK (
    parse_status IN ('ok', 'warn', 'error')
  )
);

CREATE TABLE IF NOT EXISTS public.agchain_dataset_version_validations (
  dataset_version_validation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version_id UUID NOT NULL REFERENCES public.agchain_dataset_versions(dataset_version_id) ON DELETE CASCADE,
  source_hash TEXT NOT NULL,
  validation_status TEXT NOT NULL,
  issue_groups_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  warning_count INTEGER NOT NULL DEFAULT 0,
  duplicate_id_count INTEGER NOT NULL DEFAULT 0,
  missing_field_count INTEGER NOT NULL DEFAULT 0,
  unsupported_payload_count INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_dataset_version_validations_status_check CHECK (
    validation_status IN ('pass', 'warn', 'fail', 'unknown')
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agchain_datasets'
      AND column_name = 'latest_version_id'
  ) THEN
    ALTER TABLE public.agchain_datasets
      ADD COLUMN latest_version_id UUID NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agchain_datasets_latest_version_fk'
  ) THEN
    ALTER TABLE public.agchain_datasets
      ADD CONSTRAINT agchain_datasets_latest_version_fk
      FOREIGN KEY (latest_version_id)
      REFERENCES public.agchain_dataset_versions(dataset_version_id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS agchain_dataset_version_drafts_open_unique_idx
  ON public.agchain_dataset_version_drafts (
    dataset_id,
    created_by,
    COALESCE(base_version_id, '00000000-0000-0000-0000-000000000000'::UUID),
    draft_status
  )
  WHERE draft_status = 'open';

CREATE INDEX IF NOT EXISTS agchain_datasets_project_updated_idx
  ON public.agchain_datasets (project_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS agchain_dataset_versions_dataset_created_idx
  ON public.agchain_dataset_versions (dataset_id, created_at DESC);

CREATE INDEX IF NOT EXISTS agchain_dataset_version_drafts_dataset_creator_expires_idx
  ON public.agchain_dataset_version_drafts (dataset_id, created_by, expires_at);

CREATE INDEX IF NOT EXISTS agchain_dataset_samples_dataset_version_idx
  ON public.agchain_dataset_samples (dataset_version_id);

CREATE INDEX IF NOT EXISTS agchain_dataset_version_validations_version_generated_idx
  ON public.agchain_dataset_version_validations (dataset_version_id, generated_at DESC);

ALTER TABLE public.agchain_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agchain_dataset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agchain_dataset_version_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agchain_dataset_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agchain_dataset_version_validations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.agchain_datasets FROM anon, authenticated;
REVOKE ALL ON TABLE public.agchain_dataset_versions FROM anon, authenticated;
REVOKE ALL ON TABLE public.agchain_dataset_version_drafts FROM anon, authenticated;
REVOKE ALL ON TABLE public.agchain_dataset_samples FROM anon, authenticated;
REVOKE ALL ON TABLE public.agchain_dataset_version_validations FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_datasets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_dataset_versions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_dataset_version_drafts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_dataset_samples TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_dataset_version_validations TO service_role;

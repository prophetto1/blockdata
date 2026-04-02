ALTER TABLE public.agchain_tools
  ADD COLUMN IF NOT EXISTS source_kind TEXT NOT NULL DEFAULT 'custom';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agchain_tools_source_kind_check'
  ) THEN
    ALTER TABLE public.agchain_tools
      ADD CONSTRAINT agchain_tools_source_kind_check
      CHECK (source_kind IN ('custom', 'bridged', 'mcp_server'));
  END IF;
END $$;

ALTER TABLE public.agchain_benchmark_version_tools
  ADD COLUMN IF NOT EXISTS tool_ref TEXT;

UPDATE public.agchain_benchmark_version_tools
SET tool_ref = 'custom:' || tool_version_id::text
WHERE tool_ref IS NULL
  AND tool_version_id IS NOT NULL;

ALTER TABLE public.agchain_benchmark_version_tools
  ALTER COLUMN tool_ref SET NOT NULL;

ALTER TABLE public.agchain_benchmark_version_tools
  ALTER COLUMN tool_version_id DROP NOT NULL;

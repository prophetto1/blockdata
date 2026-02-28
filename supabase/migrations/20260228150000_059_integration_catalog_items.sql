-- Migration 059: integration catalog items for superuser mapping and sync
-- Purpose:
-- - Provide a stable catalog table for external integrations (Kestra-style task classes).
-- - Keep runtime wiring separate by mapping catalog rows to service_registry/service_functions.
-- - Enable a bidirectional admin page (sync + local mapping edits).

CREATE TABLE IF NOT EXISTS public.integration_catalog_items (
  item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'kestra',
  external_id TEXT NOT NULL,
  plugin_name TEXT NOT NULL,
  plugin_title TEXT,
  plugin_group TEXT,
  plugin_version TEXT,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(categories) = 'array'),
  task_class TEXT NOT NULL,
  task_title TEXT,
  task_description TEXT,
  task_schema JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(task_schema) = 'object'),
  task_markdown TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  suggested_service_type TEXT,
  mapped_service_id UUID REFERENCES public.service_registry(service_id) ON DELETE SET NULL,
  mapped_function_id UUID REFERENCES public.service_functions(function_id) ON DELETE SET NULL,
  mapping_notes TEXT,
  source_updated_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT integration_catalog_items_source_external_unique UNIQUE (source, external_id),
  CONSTRAINT integration_catalog_items_task_class_unique UNIQUE (task_class)
);

COMMENT ON TABLE public.integration_catalog_items IS
  'Catalog of external integration task definitions (e.g., Kestra classes) with local mapping metadata.';
COMMENT ON COLUMN public.integration_catalog_items.external_id IS
  'Canonical external identity for this item (for Kestra: full task class id).';
COMMENT ON COLUMN public.integration_catalog_items.task_schema IS
  'JSON schema/details for the task definition hydrated from external source.';
COMMENT ON COLUMN public.integration_catalog_items.mapped_service_id IS
  'Optional mapping to local runtime service_registry row.';
COMMENT ON COLUMN public.integration_catalog_items.mapped_function_id IS
  'Optional mapping to local runtime service_functions row.';

CREATE INDEX IF NOT EXISTS idx_integration_catalog_items_source
  ON public.integration_catalog_items (source);
CREATE INDEX IF NOT EXISTS idx_integration_catalog_items_plugin_group
  ON public.integration_catalog_items (plugin_group);
CREATE INDEX IF NOT EXISTS idx_integration_catalog_items_enabled
  ON public.integration_catalog_items (enabled);
CREATE INDEX IF NOT EXISTS idx_integration_catalog_items_mapped_service
  ON public.integration_catalog_items (mapped_service_id);
CREATE INDEX IF NOT EXISTS idx_integration_catalog_items_mapped_function
  ON public.integration_catalog_items (mapped_function_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_integration_catalog_items_updated_at'
  ) THEN
    CREATE TRIGGER set_integration_catalog_items_updated_at
    BEFORE UPDATE ON public.integration_catalog_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.integration_catalog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS integration_catalog_items_select
  ON public.integration_catalog_items;
CREATE POLICY integration_catalog_items_select
  ON public.integration_catalog_items
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS integration_catalog_items_service_role
  ON public.integration_catalog_items;
CREATE POLICY integration_catalog_items_service_role
  ON public.integration_catalog_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.integration_catalog_items FROM anon, authenticated;
GRANT SELECT ON TABLE public.integration_catalog_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.integration_catalog_items TO service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'integration_catalog_items'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.integration_catalog_items;
    END IF;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

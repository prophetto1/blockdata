-- Migration 064: Kestra plugin catalog satellite tables
-- Normalized sub-tables extracted from the task_schema JSONB in integration_catalog_items.
-- All tables reference integration_catalog_items.item_id as FK.
-- Seeded in migration 065 (integration_catalog_items) and 066 (satellite data).

-- ---------------------------------------------------------------------------
--  kestra_plugin_inputs
--  One row per input parameter per plugin (~9700 rows)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.kestra_plugin_inputs (
  id             BIGSERIAL PRIMARY KEY,
  plugin_item_id UUID NOT NULL REFERENCES public.integration_catalog_items(item_id) ON DELETE CASCADE,
  param_name     TEXT NOT NULL,
  param_type     TEXT,
  param_title    TEXT,
  param_description TEXT,
  param_required BOOLEAN NOT NULL DEFAULT false,
  param_dynamic  BOOLEAN,
  param_default  TEXT,
  param_enum     JSONB,
  param_format   TEXT,
  param_deprecated BOOLEAN NOT NULL DEFAULT false,
  param_group    TEXT,
  param_ref      TEXT,
  param_items_type TEXT,
  param_any_of   JSONB,
  CONSTRAINT kestra_plugin_inputs_item_param_unique UNIQUE (plugin_item_id, param_name)
);

CREATE INDEX IF NOT EXISTS idx_kestra_plugin_inputs_item
  ON public.kestra_plugin_inputs (plugin_item_id);
CREATE INDEX IF NOT EXISTS idx_kestra_plugin_inputs_required
  ON public.kestra_plugin_inputs (param_required);

-- ---------------------------------------------------------------------------
--  kestra_plugin_outputs
--  One row per output field per plugin (~2300 rows)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.kestra_plugin_outputs (
  id             BIGSERIAL PRIMARY KEY,
  plugin_item_id UUID NOT NULL REFERENCES public.integration_catalog_items(item_id) ON DELETE CASCADE,
  output_name    TEXT NOT NULL,
  output_type    TEXT,
  output_title   TEXT,
  output_description TEXT,
  output_required BOOLEAN NOT NULL DEFAULT false,
  output_format  TEXT,
  output_ref     TEXT,
  output_items_type TEXT,
  CONSTRAINT kestra_plugin_outputs_item_name_unique UNIQUE (plugin_item_id, output_name)
);

CREATE INDEX IF NOT EXISTS idx_kestra_plugin_outputs_item
  ON public.kestra_plugin_outputs (plugin_item_id);

-- ---------------------------------------------------------------------------
--  kestra_plugin_examples
--  One row per YAML example per plugin (~1451 rows)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.kestra_plugin_examples (
  id             BIGSERIAL PRIMARY KEY,
  plugin_item_id UUID NOT NULL REFERENCES public.integration_catalog_items(item_id) ON DELETE CASCADE,
  example_index  INTEGER NOT NULL,
  example_title  TEXT NOT NULL DEFAULT '',
  example_code   TEXT NOT NULL DEFAULT '',
  example_lang   TEXT NOT NULL DEFAULT 'yaml',
  example_full   BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT kestra_plugin_examples_item_index_unique UNIQUE (plugin_item_id, example_index)
);

CREATE INDEX IF NOT EXISTS idx_kestra_plugin_examples_item
  ON public.kestra_plugin_examples (plugin_item_id);

-- ---------------------------------------------------------------------------
--  kestra_plugin_definitions
--  One row per reusable type definition per plugin (~4400 rows)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.kestra_plugin_definitions (
  id             BIGSERIAL PRIMARY KEY,
  plugin_item_id UUID NOT NULL REFERENCES public.integration_catalog_items(item_id) ON DELETE CASCADE,
  def_name       TEXT NOT NULL,
  def_type       TEXT,
  def_required   JSONB,
  def_properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT kestra_plugin_definitions_item_name_unique UNIQUE (plugin_item_id, def_name)
);

CREATE INDEX IF NOT EXISTS idx_kestra_plugin_definitions_item
  ON public.kestra_plugin_definitions (plugin_item_id);

-- ---------------------------------------------------------------------------
--  kestra_provider_enrichment
--  One row per plugin_group — maps plugin groups to provider metadata (~56 rows)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.kestra_provider_enrichment (
  plugin_group       TEXT PRIMARY KEY,
  provider_name      TEXT NOT NULL,
  provider_base_url  TEXT,
  provider_docs_url  TEXT,
  auth_type          TEXT,
  auth_fields        JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_internal        BOOLEAN NOT NULL DEFAULT false
);

-- ---------------------------------------------------------------------------
--  RLS — read for authenticated, write for service_role
-- ---------------------------------------------------------------------------

ALTER TABLE public.kestra_plugin_inputs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kestra_plugin_outputs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kestra_plugin_examples    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kestra_plugin_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kestra_provider_enrichment ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'kestra_plugin_inputs',
    'kestra_plugin_outputs',
    'kestra_plugin_examples',
    'kestra_plugin_definitions',
    'kestra_provider_enrichment'
  ] LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS %I_select ON public.%I;
      CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING (true);
      DROP POLICY IF EXISTS %I_service_role ON public.%I;
      CREATE POLICY %I_service_role ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);
      REVOKE ALL ON TABLE public.%I FROM anon, authenticated;
      GRANT SELECT ON TABLE public.%I TO authenticated;
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role;
    ',
      t, t,
      t, t,
      t, t,
      t, t,
      t,
      t,
      t
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

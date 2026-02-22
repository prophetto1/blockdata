-- Migration 043: conversion service catalog registry
-- Purpose:
-- - Create a canonical DB registry for conversion services by ingest track.
-- - Keep terms aligned with existing ingest/conversion vocabulary.

CREATE TABLE IF NOT EXISTS public.conversion_service_catalog (
  track TEXT PRIMARY KEY
    CHECK (track IN ('mdast', 'docling', 'pandoc')),
  service_name TEXT NOT NULL,
  entrypoint TEXT NOT NULL,
  source_types JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(source_types) = 'array'),
  primary_representation_type TEXT NOT NULL
    CHECK (primary_representation_type IN (
      'markdown_bytes',
      'doclingdocument_json',
      'pandoc_ast_json'
    )),
  supplemental_representation_types JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(supplemental_representation_types) = 'array'),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.conversion_service_catalog IS
  'Canonical registry of conversion services by ingest track.';
COMMENT ON COLUMN public.conversion_service_catalog.track IS
  'Ingest track key (mdast, docling, pandoc).';
COMMENT ON COLUMN public.conversion_service_catalog.service_name IS
  'Canonical service identifier for the track implementation.';
COMMENT ON COLUMN public.conversion_service_catalog.entrypoint IS
  'Service entrypoint or route used to execute conversion.';
COMMENT ON COLUMN public.conversion_service_catalog.source_types IS
  'Supported source_type values for this conversion service.';
COMMENT ON COLUMN public.conversion_service_catalog.primary_representation_type IS
  'Primary representation_type produced for parsing.';
COMMENT ON COLUMN public.conversion_service_catalog.supplemental_representation_types IS
  'Optional additional representation_type outputs.';

ALTER TABLE public.conversion_service_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversion_service_catalog_select
  ON public.conversion_service_catalog;
CREATE POLICY conversion_service_catalog_select
  ON public.conversion_service_catalog
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS conversion_service_catalog_service_role
  ON public.conversion_service_catalog;
CREATE POLICY conversion_service_catalog_service_role
  ON public.conversion_service_catalog
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.conversion_service_catalog FROM anon, authenticated;
GRANT SELECT ON TABLE public.conversion_service_catalog TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.conversion_service_catalog TO service_role;

NOTIFY pgrst, 'reload schema';

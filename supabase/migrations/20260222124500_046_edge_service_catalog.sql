-- Migration 046: edge service catalog registry
-- Purpose:
-- - Create a canonical DB registry for edge-side ingest/parse behavior by track.

CREATE TABLE IF NOT EXISTS public.edge_service_catalog (
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

COMMENT ON TABLE public.edge_service_catalog IS
  'Canonical registry of edge-side ingest/parse behavior by track.';
COMMENT ON COLUMN public.edge_service_catalog.track IS
  'Ingest track key (mdast, docling, pandoc).';
COMMENT ON COLUMN public.edge_service_catalog.service_name IS
  'Edge service/function identifier.';
COMMENT ON COLUMN public.edge_service_catalog.entrypoint IS
  'Edge function route used to execute ingest orchestration.';
COMMENT ON COLUMN public.edge_service_catalog.source_types IS
  'Effective source_type values handled through edge ingest for the track.';
COMMENT ON COLUMN public.edge_service_catalog.primary_representation_type IS
  'Primary representation_type persisted by edge parse completion.';
COMMENT ON COLUMN public.edge_service_catalog.supplemental_representation_types IS
  'Optional additional representation_type artifacts persisted by edge parse completion.';

ALTER TABLE public.edge_service_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS edge_service_catalog_select
  ON public.edge_service_catalog;
CREATE POLICY edge_service_catalog_select
  ON public.edge_service_catalog
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS edge_service_catalog_service_role
  ON public.edge_service_catalog;
CREATE POLICY edge_service_catalog_service_role
  ON public.edge_service_catalog
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.edge_service_catalog FROM anon, authenticated;
GRANT SELECT ON TABLE public.edge_service_catalog TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.edge_service_catalog TO service_role;

INSERT INTO public.edge_service_catalog (
  track,
  service_name,
  entrypoint,
  source_types,
  primary_representation_type,
  supplemental_representation_types,
  notes
)
VALUES
  (
    'mdast',
    'ingest',
    '/functions/v1/ingest',
    '["md","txt"]'::jsonb,
    'markdown_bytes',
    '["pandoc_ast_json"]'::jsonb,
    'md is parsed inline in ingest; txt routes through conversion service and is finalized by edge parse completion.'
  ),
  (
    'docling',
    'ingest',
    '/functions/v1/ingest',
    '["docx","pdf","pptx","xlsx","html","csv"]'::jsonb,
    'doclingdocument_json',
    '["markdown_bytes","pandoc_ast_json","html_bytes","doctags_text"]'::jsonb,
    'Routed through conversion service, then parsed/finalized by edge conversion-complete.'
  ),
  (
    'pandoc',
    'ingest',
    '/functions/v1/ingest',
    '["rst","latex","odt","epub","rtf","org"]'::jsonb,
    'pandoc_ast_json',
    '["markdown_bytes"]'::jsonb,
    'Routed through conversion service, then parsed/finalized by edge conversion-complete.'
  )
ON CONFLICT (track) DO UPDATE
SET
  service_name = EXCLUDED.service_name,
  entrypoint = EXCLUDED.entrypoint,
  source_types = EXCLUDED.source_types,
  primary_representation_type = EXCLUDED.primary_representation_type,
  supplemental_representation_types = EXCLUDED.supplemental_representation_types,
  notes = EXCLUDED.notes,
  updated_at = now();

NOTIFY pgrst, 'reload schema';

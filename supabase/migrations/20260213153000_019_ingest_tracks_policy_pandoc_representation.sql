-- Migration 019: ingest track policy standardization + pandoc source types + representation artifacts

-- ---------------------------------------------------------------------------
-- 1) Expand documents_v2.source_type allowed values for initial pandoc rollout
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.documents_v2'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%source_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.documents_v2 DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.documents_v2
  ADD CONSTRAINT documents_v2_source_type_check
  CHECK (source_type IN (
    'md', 'txt', 'docx', 'pptx', 'pdf', 'html', 'image',
    'asciidoc', 'csv', 'xlsx', 'xml_uspto', 'xml_jats',
    'mets_gbs', 'json_docling', 'audio', 'vtt',
    'rst', 'latex', 'odt', 'epub', 'rtf', 'org'
  ));

-- ---------------------------------------------------------------------------
-- 2) First-class representation artifacts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversion_representations_v2 (
  representation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_uid TEXT NOT NULL REFERENCES public.documents_v2(source_uid) ON DELETE CASCADE,
  conv_uid TEXT NOT NULL UNIQUE CHECK (conv_uid ~ '^[0-9a-f]{64}$'),
  parsing_tool TEXT NOT NULL CHECK (parsing_tool IN ('mdast', 'docling', 'pandoc')),
  representation_type TEXT NOT NULL CHECK (representation_type IN (
    'markdown_bytes', 'doclingdocument_json', 'pandoc_ast_json'
  )),
  artifact_locator TEXT NOT NULL,
  artifact_hash TEXT NOT NULL CHECK (artifact_hash ~ '^[0-9a-f]{64}$'),
  artifact_size_bytes INTEGER NOT NULL CHECK (artifact_size_bytes >= 0),
  artifact_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversion_representations_v2_pairing CHECK (
    (parsing_tool = 'mdast' AND representation_type = 'markdown_bytes') OR
    (parsing_tool = 'docling' AND representation_type = 'doclingdocument_json') OR
    (parsing_tool = 'pandoc' AND representation_type = 'pandoc_ast_json')
  )
);

CREATE INDEX IF NOT EXISTS idx_conversion_representations_v2_source_created
  ON public.conversion_representations_v2(source_uid, created_at DESC);

ALTER TABLE public.conversion_representations_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversion_representations_v2_select_own ON public.conversion_representations_v2;
CREATE POLICY conversion_representations_v2_select_own
  ON public.conversion_representations_v2
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.documents_v2 d
      WHERE d.source_uid = conversion_representations_v2.source_uid
        AND d.owner_id = auth.uid()
    )
  );

INSERT INTO public.conversion_representations_v2 (
  source_uid,
  conv_uid,
  parsing_tool,
  representation_type,
  artifact_locator,
  artifact_hash,
  artifact_size_bytes,
  artifact_meta
)
SELECT
  d.source_uid,
  d.conv_uid,
  d.conv_parsing_tool,
  d.conv_representation_type,
  COALESCE(d.conv_locator, d.source_locator),
  d.conv_uid,
  0,
  jsonb_build_object('source_type', d.source_type, 'backfilled', true)
FROM public.documents_v2 d
WHERE d.conv_uid IS NOT NULL
  AND d.conv_parsing_tool IS NOT NULL
  AND d.conv_representation_type IS NOT NULL
ON CONFLICT (conv_uid) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) Seed new ingest runtime policy keys
-- ---------------------------------------------------------------------------
INSERT INTO public.admin_runtime_policy (policy_key, value_jsonb, value_type, description)
VALUES
  (
    'upload.track_enabled',
    '{"mdast":true,"docling":true,"pandoc":false}'::jsonb,
    'object',
    'Per-track runtime enablement flags for ingest routing'
  ),
  (
    'upload.extension_track_routing',
    '{
      "md":"mdast",
      "markdown":"mdast",
      "txt":"mdast",
      "docx":"docling",
      "pdf":"docling",
      "pptx":"docling",
      "xlsx":"docling",
      "html":"docling",
      "htm":"docling",
      "csv":"docling",
      "rst":"pandoc",
      "tex":"pandoc",
      "latex":"pandoc",
      "odt":"pandoc",
      "epub":"pandoc",
      "rtf":"pandoc",
      "org":"pandoc"
    }'::jsonb,
    'object',
    'Extension to ingest track routing map'
  ),
  (
    'upload.track_capability_catalog',
    '{
      "version":"2026-02-13",
      "tracks":{
        "mdast":{"extensions":["md","markdown","txt"]},
        "docling":{"extensions":["docx","pdf","pptx","xlsx","html","htm","csv"]},
        "pandoc":{"extensions":["rst","tex","latex","odt","epub","rtf","org"]}
      }
    }'::jsonb,
    'object',
    'Track capability catalog (full parser support independent from enabled subset)'
  )
ON CONFLICT (policy_key) DO NOTHING;

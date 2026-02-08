-- Migration 003: v2 parallel tables (documents_v2 + blocks_v2)
-- Applied: 2026-02-08
-- Purpose: Create v2 document and block tables alongside v1 for comparison.
-- Source spec: docs/product-defining-v2.0/0207-immutable-fields.md + 0207-prd-tech-spec-doc2.md

-- 1. documents_v2
CREATE TABLE documents_v2 (
  source_uid TEXT PRIMARY KEY
    CHECK (source_uid ~ '^[0-9a-f]{64}$'),
  owner_id UUID NOT NULL,

  source_type TEXT NOT NULL
    CHECK (source_type IN (
      'md', 'txt', 'docx', 'pptx', 'pdf', 'html', 'image',
      'asciidoc', 'csv', 'xlsx', 'xml_uspto', 'xml_jats',
      'mets_gbs', 'json_docling', 'audio', 'vtt'
    )),
  source_filesize INTEGER,
  source_total_characters INTEGER,
  source_locator TEXT NOT NULL,
  doc_title TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  conv_uid TEXT UNIQUE
    CHECK (conv_uid IS NULL OR conv_uid ~ '^[0-9a-f]{64}$'),
  conv_status TEXT
    CHECK (conv_status IS NULL OR conv_status IN ('success', 'partial_success', 'failure')),
  conv_parsing_tool TEXT
    CHECK (conv_parsing_tool IS NULL OR conv_parsing_tool IN ('mdast', 'docling', 'pandoc')),
  conv_representation_type TEXT
    CHECK (conv_representation_type IS NULL OR conv_representation_type IN (
      'markdown_bytes', 'doclingdocument_json', 'pandoc_ast_json'
    )),
  conv_total_blocks INTEGER,
  conv_block_type_freq JSONB,
  conv_total_characters INTEGER,
  conv_locator TEXT,

  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'converting', 'ingested', 'conversion_failed', 'ingest_failed')),
  error TEXT,
  conversion_job_id UUID,

  CHECK (status <> 'converting' OR conversion_job_id IS NOT NULL),
  CHECK (
    conv_parsing_tool IS NULL
    OR (conv_parsing_tool = 'mdast' AND conv_representation_type = 'markdown_bytes')
    OR (conv_parsing_tool = 'docling' AND conv_representation_type = 'doclingdocument_json')
    OR (conv_parsing_tool = 'pandoc' AND conv_representation_type = 'pandoc_ast_json')
  )
);

-- 2. blocks_v2
CREATE TABLE blocks_v2 (
  block_uid TEXT PRIMARY KEY
    CHECK (block_uid ~ '^[0-9a-f]{64}:\d+$'),
  conv_uid TEXT NOT NULL REFERENCES documents_v2(conv_uid),
  block_index INTEGER NOT NULL
    CHECK (block_index >= 0),
  block_type TEXT NOT NULL
    CHECK (block_type IN (
      'heading', 'paragraph', 'list_item', 'code_block', 'table',
      'figure', 'caption', 'footnote', 'divider', 'html_block',
      'definition', 'checkbox', 'form_region', 'key_value_region',
      'page_header', 'page_footer', 'other'
    )),
  block_locator JSONB NOT NULL
    CHECK (block_locator->>'type' IS NOT NULL),
  block_content TEXT NOT NULL,

  UNIQUE (conv_uid, block_index)
);

-- 3. Indexes
CREATE INDEX idx_documents_v2_owner_uploaded ON documents_v2(owner_id, uploaded_at DESC);
CREATE INDEX idx_documents_v2_uploaded ON documents_v2(uploaded_at DESC);
CREATE INDEX idx_blocks_v2_conv_uid ON blocks_v2(conv_uid);
CREATE INDEX idx_blocks_v2_conv_uid_index ON blocks_v2(conv_uid, block_index);

-- 4. RLS
ALTER TABLE documents_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_v2_select_own ON documents_v2
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY blocks_v2_select_own ON blocks_v2
  FOR SELECT USING (
    conv_uid IN (SELECT conv_uid FROM documents_v2 WHERE owner_id = auth.uid())
  );

-- 5. Trigger
CREATE TRIGGER set_documents_v2_updated_at
  BEFORE UPDATE ON documents_v2
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. Migrate documents
INSERT INTO documents_v2 (
  source_uid, owner_id, source_type, source_filesize, source_total_characters,
  source_locator, doc_title, uploaded_at, updated_at,
  conv_uid, conv_status, conv_parsing_tool, conv_representation_type,
  conv_total_blocks, conv_block_type_freq, conv_total_characters,
  conv_locator, status, error, conversion_job_id
)
SELECT
  d.source_uid,
  d.owner_id,
  d.source_type,
  NULL::integer,
  CASE WHEN d.source_type = 'md' AND d.doc_uid IS NOT NULL THEN
    (SELECT COALESCE(SUM(length(b.content_original)), 0)::integer
     FROM blocks b WHERE b.doc_uid = d.doc_uid)
  ELSE NULL::integer END,
  d.source_locator,
  d.doc_title,
  d.uploaded_at,
  d.updated_at,
  d.doc_uid,
  CASE
    WHEN d.status = 'ingested' THEN 'success'
    WHEN d.status IN ('conversion_failed', 'ingest_failed') THEN 'failure'
    ELSE NULL
  END,
  CASE WHEN d.doc_uid IS NOT NULL THEN
    CASE WHEN d.source_type = 'md' THEN 'mdast' ELSE 'docling' END
  ELSE NULL END,
  CASE WHEN d.doc_uid IS NOT NULL THEN
    CASE WHEN d.source_type = 'md' THEN 'markdown_bytes' ELSE 'doclingdocument_json' END
  ELSE NULL END,
  CASE WHEN d.doc_uid IS NOT NULL THEN
    (SELECT COUNT(*)::integer FROM blocks b WHERE b.doc_uid = d.doc_uid)
  ELSE NULL::integer END,
  CASE WHEN d.doc_uid IS NOT NULL THEN
    (SELECT COALESCE(jsonb_object_agg(mapped_type, cnt), '{}'::jsonb)
     FROM (
       SELECT
         CASE b.block_type WHEN 'code' THEN 'code_block' ELSE b.block_type END as mapped_type,
         COUNT(*)::integer as cnt
       FROM blocks b WHERE b.doc_uid = d.doc_uid
       GROUP BY CASE b.block_type WHEN 'code' THEN 'code_block' ELSE b.block_type END
     ) sub)
  ELSE NULL::jsonb END,
  CASE WHEN d.doc_uid IS NOT NULL THEN
    (SELECT COALESCE(SUM(length(b.content_original)), 0)::integer
     FROM blocks b WHERE b.doc_uid = d.doc_uid)
  ELSE NULL::integer END,
  d.md_locator,
  d.status,
  d.error,
  d.conversion_job_id
FROM documents d;

-- 7. Migrate blocks (map 'code' -> 'code_block')
INSERT INTO blocks_v2 (block_uid, conv_uid, block_index, block_type, block_locator, block_content)
SELECT
  b.doc_uid || ':' || b.block_index::text,
  b.doc_uid,
  b.block_index,
  CASE b.block_type WHEN 'code' THEN 'code_block' ELSE b.block_type END,
  jsonb_build_object(
    'type', 'text_offset_range',
    'start_offset', b.char_span[1],
    'end_offset', b.char_span[2]
  ),
  b.content_original
FROM blocks b
WHERE b.doc_uid IS NOT NULL;

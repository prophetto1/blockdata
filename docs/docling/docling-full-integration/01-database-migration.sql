-- =============================================================================
-- Docling Full-Pipeline Integration: Database Migration
-- =============================================================================
-- Date:    2026-02-20
-- Purpose: Add parser provenance to conversion_parsing, add block-level
--          geometry/native-label columns to blocks, fix realtime publication,
--          add missing catalog entries.
--
-- Safety:  All new columns are nullable. Zero data migration needed.
--          Existing rows get NULL for new columns. Fully backwards-compatible.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. NEW COLUMNS ON conversion_parsing (parser provenance)
-- ---------------------------------------------------------------------------
-- These 9 columns capture the full provenance of how Docling (or any future
-- parser) converted the document. Required by REQ-REP-01 through REQ-PROV-03
-- from the exhaustive Docling analysis (output-a-docling-2.1-2.3-exhaustive-analysis-v2.md).

ALTER TABLE conversion_parsing
  ADD COLUMN IF NOT EXISTS parser_version          text,
  ADD COLUMN IF NOT EXISTS parser_pipeline_family   text,
  ADD COLUMN IF NOT EXISTS parser_profile_name      text,
  ADD COLUMN IF NOT EXISTS parser_backend_name      text,
  ADD COLUMN IF NOT EXISTS parser_input_format      text,
  ADD COLUMN IF NOT EXISTS parser_input_mime         text,
  ADD COLUMN IF NOT EXISTS parser_options_json       jsonb,
  ADD COLUMN IF NOT EXISTS parser_options_hash       text,
  ADD COLUMN IF NOT EXISTS parser_extenders_json     jsonb,
  ADD COLUMN IF NOT EXISTS conversion_meta_json      jsonb;

COMMENT ON COLUMN conversion_parsing.parser_version IS
  'Parser library version string, e.g. "2.71.0" for Docling';
COMMENT ON COLUMN conversion_parsing.parser_pipeline_family IS
  'Auto-selected pipeline class: StandardPdfPipeline, SimplePipeline, AsrPipeline';
COMMENT ON COLUMN conversion_parsing.parser_profile_name IS
  'Quality tier name: docling_pdf_balanced_default, docling_pdf_high_recall_layout_semantic, etc.';
COMMENT ON COLUMN conversion_parsing.parser_backend_name IS
  'Backend class: DoclingParseV4DocumentBackend, MsWordDocumentBackend, etc.';
COMMENT ON COLUMN conversion_parsing.parser_input_format IS
  'Docling InputFormat enum value: pdf, docx, html, image, audio, etc.';
COMMENT ON COLUMN conversion_parsing.parser_input_mime IS
  'Detected MIME type from Docling format resolution';
COMMENT ON COLUMN conversion_parsing.parser_options_json IS
  'Effective pipeline options at conversion time (canonicalized JSON for reproducibility)';
COMMENT ON COLUMN conversion_parsing.parser_options_hash IS
  'SHA-256 of parser_options_json — enables cheap equality checks across conversions';
COMMENT ON COLUMN conversion_parsing.parser_extenders_json IS
  'Which enrichers ran and their config: {"do_ocr":true,"do_table_structure":true,...}';
COMMENT ON COLUMN conversion_parsing.conversion_meta_json IS
  'Conversion-level metadata: status, errors[], timings{}, confidence. Queryable complement to artifact_meta on conversion_representations';

-- ---------------------------------------------------------------------------
-- 2. NEW COLUMNS ON blocks (native labels, geometry, metadata)
-- ---------------------------------------------------------------------------
-- These 6 columns persist Docling-native data that the current schema discards.
-- Required by REQ-BLK-04, REQ-BLK-05 from the exhaustive analysis.

ALTER TABLE blocks
  ADD COLUMN IF NOT EXISTS raw_element_type      text,
  ADD COLUMN IF NOT EXISTS raw_group_type        text,
  ADD COLUMN IF NOT EXISTS raw_item_ref          text,
  ADD COLUMN IF NOT EXISTS page_no               integer,
  ADD COLUMN IF NOT EXISTS coordinates_json      jsonb,
  ADD COLUMN IF NOT EXISTS parser_metadata_json  jsonb;

COMMENT ON COLUMN blocks.raw_element_type IS
  'Native DocItemLabel before platform mapping (23-value enum: paragraph, section_header, title, formula, code, table, picture, caption, footnote, list_item, page_header, page_footer, checkbox_selected, checkbox_unselected, chart, document_index, empty_value, form, grading_scale, handwritten_text, key_value_region, reference, text)';
COMMENT ON COLUMN blocks.raw_group_type IS
  'Parent GroupLabel from DoclingDocument structure (12-value enum: chapter, comment_section, form_area, inline, key_value_area, list, ordered_list, picture_area, section, sheet, slide, unspecified)';
COMMENT ON COLUMN blocks.raw_item_ref IS
  'Docling self_ref pointer for hierarchy reconstruction, e.g. "#/texts/5", "#/tables/0"';
COMMENT ON COLUMN blocks.page_no IS
  'Page number for paginated formats (PDF, PPTX, XLSX). Promoted from block_locator JSONB for direct filtering/sorting';
COMMENT ON COLUMN blocks.coordinates_json IS
  'Bounding box from prov[0].bbox: {"l":0,"t":0,"r":612,"b":792,"coord_origin":"BOTTOMLEFT"}. NULL for non-paginated formats';
COMMENT ON COLUMN blocks.parser_metadata_json IS
  'Format-specific metadata catch-all: charspan, heading level, formatting (bold/italic from DOCX), hyperlink (HTML), code_language, picture classification/description, table cell structure, audio timestamps, confidence scores';

-- Index on page_no for filtering blocks by page in the grid UI.
-- Partial index excludes NULLs (non-paginated formats).
CREATE INDEX IF NOT EXISTS idx_blocks_page_no
  ON blocks (page_no)
  WHERE page_no IS NOT NULL;

-- Index on raw_element_type for filtering by native label.
CREATE INDEX IF NOT EXISTS idx_blocks_raw_element_type
  ON blocks (raw_element_type)
  WHERE raw_element_type IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. ADD conversion_parsing.created_at (currently missing)
-- ---------------------------------------------------------------------------
-- The table definition in the split migration didn't include created_at.
-- Needed for tracking when conversions happened.

ALTER TABLE conversion_parsing
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- ---------------------------------------------------------------------------
-- 4. CATALOG ENTRIES
-- ---------------------------------------------------------------------------

-- 4a. document_status_catalog: add 'partial_success'
-- Docling's ConversionStatus enum includes PARTIAL_SUCCESS (some pages failed,
-- others succeeded). We surface this so the UI can show partial results.
INSERT INTO document_status_catalog (status, description, sort_order)
VALUES ('partial_success', 'Conversion partially succeeded (some pages/sections failed)', 6)
ON CONFLICT (status) DO NOTHING;

-- 4b. conv_status_catalog: add 'partial_success'
INSERT INTO conv_status_catalog (conv_status, description, sort_order)
VALUES ('partial_success', 'Parser produced results but with errors on some pages', 4)
ON CONFLICT (conv_status) DO NOTHING;

-- 4c. block_type_catalog: verify completeness
-- Current 17 types already cover all Docling DocItemLabel mappings:
--   heading, paragraph, list_item, code_block, table, figure, caption,
--   footnote, divider, html_block, definition, checkbox, form_region,
--   key_value_region, page_header, page_footer, other
-- No new entries needed. The raw_element_type column stores the native
-- 23-value enum WITHOUT FK enforcement (it's parser-opaque).

-- 4d. source_type_catalog: already has all 22 types including image, audio,
-- vtt, asciidoc, xml_jats, xml_uspto, json_docling, mets_gbs. No changes.

-- ---------------------------------------------------------------------------
-- 5. REALTIME PUBLICATION (Already Applied)
-- ---------------------------------------------------------------------------
-- source_documents was added to supabase_realtime in the
-- fix_realtime_and_stale_rpc_references migration (2026-02-20).
-- No action needed here.

-- ---------------------------------------------------------------------------
-- 6. UPDATE documents_view TO INCLUDE NEW COLUMNS
-- ---------------------------------------------------------------------------
-- The read-only view joining source_documents + conversion_parsing needs to
-- expose the new provenance columns.

DROP VIEW IF EXISTS documents_view;

CREATE VIEW documents_view AS
SELECT
  sd.source_uid,
  sd.owner_id,
  sd.source_type,
  sd.source_filesize,
  sd.source_total_characters,
  sd.source_locator,
  sd.doc_title,
  sd.uploaded_at,
  sd.updated_at,
  sd.status,
  sd.error,
  sd.conversion_job_id,
  sd.project_id,
  -- conversion_parsing columns
  cp.conv_uid,
  cp.conv_status,
  cp.conv_parsing_tool,
  cp.conv_representation_type,
  cp.conv_total_blocks,
  cp.conv_block_type_freq,
  cp.conv_total_characters,
  cp.conv_locator,
  -- NEW: parser provenance columns
  cp.parser_version,
  cp.parser_pipeline_family,
  cp.parser_profile_name,
  cp.parser_backend_name,
  cp.parser_input_format,
  cp.parser_input_mime,
  cp.parser_options_hash,
  cp.parser_extenders_json,
  cp.conversion_meta_json,
  cp.created_at AS conv_created_at
FROM source_documents sd
LEFT JOIN conversion_parsing cp ON cp.source_uid = sd.source_uid;

COMMENT ON VIEW documents_view IS
  'Read-only JOIN of source_documents + conversion_parsing. Includes parser provenance columns. Use source_documents or conversion_parsing directly for writes.';

-- ---------------------------------------------------------------------------
-- 7. RLS POLICIES FOR NEW COLUMNS
-- ---------------------------------------------------------------------------
-- No new RLS policies needed. The existing row-level policies on blocks and
-- conversion_parsing already cover all columns (they filter by owner_id or
-- conv_uid ownership chain). The new columns are just additional nullable
-- fields on existing rows.

-- ---------------------------------------------------------------------------
-- 8. NOTIFY POSTGREST TO RELOAD SCHEMA CACHE
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
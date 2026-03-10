-- Add pipeline_config jsonb to conversion_parsing and create parsing_profiles table.
-- Parser-agnostic: works for docling, pandoc, remark, or any future parser.

-- 1. Add pipeline_config column to existing conversion_parsing table
ALTER TABLE public.conversion_parsing
  ADD COLUMN IF NOT EXISTS pipeline_config jsonb DEFAULT '{}';

COMMENT ON COLUMN public.conversion_parsing.pipeline_config IS
  'Full pipeline configuration used for this conversion run. Parser identified by conv_parsing_tool.';

-- 2. Create parsing_profiles table — 3 columns: id, parser, config
CREATE TABLE IF NOT EXISTS public.parsing_profiles (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parser  text NOT NULL,
  config  jsonb NOT NULL DEFAULT '{}'
);

COMMENT ON TABLE public.parsing_profiles IS
  'Saved pipeline configuration profiles. parser = "docling" | "pandoc" | "remark" | etc.';

-- 3. Seed docling profiles
INSERT INTO public.parsing_profiles (parser, config) VALUES
(
  'docling',
  '{
    "name": "Fast",
    "description": "Basic text extraction. Best for clean, text-heavy documents.",
    "pipeline": "standard",
    "pdf_pipeline": {
      "do_ocr": true,
      "ocr_options": { "kind": "tesseract", "lang": ["eng"] },
      "layout_options": { "model": "heron" },
      "do_table_structure": true,
      "table_structure_options": { "mode": "fast", "do_cell_matching": true }
    },
    "enrichments": {}
  }'
),
(
  'docling',
  '{
    "name": "Balanced",
    "description": "Good balance of quality and speed. Handles most documents well.",
    "is_default": true,
    "pipeline": "standard",
    "pdf_pipeline": {
      "do_ocr": true,
      "ocr_options": { "kind": "easyocr", "lang": ["en"] },
      "layout_options": { "model": "heron" },
      "do_table_structure": true,
      "table_structure_options": { "mode": "fast", "do_cell_matching": true }
    },
    "enrichments": { "do_picture_classification": true }
  }'
),
(
  'docling',
  '{
    "name": "High Quality",
    "description": "Best quality for complex documents with tables, charts, and mixed layouts.",
    "pipeline": "standard",
    "pdf_pipeline": {
      "do_ocr": true,
      "ocr_options": { "kind": "easyocr", "lang": ["en"] },
      "layout_options": { "model": "heron" },
      "do_table_structure": true,
      "table_structure_options": { "mode": "accurate", "do_cell_matching": true },
      "do_code_enrichment": true,
      "do_formula_enrichment": true,
      "generate_picture_images": true
    },
    "enrichments": {
      "do_picture_classification": true,
      "do_picture_description": true,
      "do_chart_extraction": true
    }
  }'
),
(
  'docling',
  '{
    "name": "AI Vision",
    "description": "Vision AI reads each page directly. Best for messy scans and complex layouts.",
    "pipeline": "vlm",
    "vlm_pipeline": {
      "vlm_options": { "preset": "granite_docling", "response_format": "doctags" },
      "generate_page_images": true
    },
    "enrichments": { "do_picture_description": true }
  }'
);

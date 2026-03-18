-- Migration 098: Add tree-sitter parse track
-- Widens DB constraints to allow tree_sitter alongside docling.
-- Does NOT modify edge functions or admin_policy — tree-sitter bypasses those.

-- =========================================================================
-- 1. Widen conversion_parsing.conv_parsing_tool constraint
-- =========================================================================
-- Original constraint from migration 003 allows ('mdast', 'docling', 'pandoc').
-- Migration 081 deleted non-docling rows but did NOT alter the CHECK.
-- We must widen it to include 'tree_sitter'.

ALTER TABLE public.conversion_parsing
  DROP CONSTRAINT IF EXISTS conversion_parsing_conv_parsing_tool_check;

ALTER TABLE public.conversion_parsing
  ADD CONSTRAINT conversion_parsing_conv_parsing_tool_check
  CHECK (conv_parsing_tool IS NULL OR conv_parsing_tool IN ('mdast', 'docling', 'pandoc', 'tree_sitter'));

-- =========================================================================
-- 2. Widen conversion_representations constraints
-- =========================================================================

-- Drop the docling-only pairing constraint (from migration 081)
ALTER TABLE public.conversion_representations
  DROP CONSTRAINT IF EXISTS conversion_representations_pairing;

ALTER TABLE public.conversion_representations
  ADD CONSTRAINT conversion_representations_pairing CHECK (
    (parsing_tool = 'docling' AND representation_type IN (
      'markdown_bytes', 'doclingdocument_json', 'html_bytes', 'doctags_text', 'citations_json'
    ))
    OR
    (parsing_tool = 'tree_sitter' AND representation_type IN (
      'tree_sitter_ast_json', 'tree_sitter_symbols_json'
    ))
  );

-- Drop the docling-only parsing_tool constraint (from migration 081)
ALTER TABLE public.conversion_representations
  DROP CONSTRAINT IF EXISTS conversion_representations_v2_parsing_tool_check;

ALTER TABLE public.conversion_representations
  ADD CONSTRAINT conversion_representations_v2_parsing_tool_check
  CHECK (parsing_tool IN ('docling', 'tree_sitter'));

-- =========================================================================
-- 3. Seed tree-sitter parsing profiles
-- =========================================================================

INSERT INTO public.parsing_profiles (id, parser, config)
VALUES
  (gen_random_uuid(), 'tree_sitter', '{
    "name": "Tree-sitter Standard",
    "description": "Full AST + symbol outline for supported code files",
    "is_default": true,
    "artifacts": ["ast_json", "symbols_json"]
  }'::jsonb),
  (gen_random_uuid(), 'tree_sitter', '{
    "name": "Symbols Only",
    "description": "Symbol outline without full AST — smaller artifacts",
    "is_default": false,
    "artifacts": ["symbols_json"]
  }'::jsonb)
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 4. Add code extensions to allowed uploads (but NOT to extension_track_routing)
-- =========================================================================
-- Note: Do NOT add code extensions to upload.extension_track_routing.
-- That table is read by trigger-parse, which would try to route tree_sitter
-- through /convert (which doesn't handle it). The /parse route resolves
-- tracks internally via is_code_extension(). We only need the extensions
-- permitted for upload.

UPDATE public.admin_runtime_policy
SET value_jsonb = value_jsonb || '["java","py","js","jsx","ts","tsx","go","rs","cs"]'::jsonb,
    updated_at = now()
WHERE policy_key = 'upload.allowed_extensions';

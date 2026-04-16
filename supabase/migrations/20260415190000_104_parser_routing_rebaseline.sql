-- Migration 104: parser routing rebaseline (schema + registries only)
--
-- Purpose:
-- - Unblock Platform API /parse writes for mdast and pandoc lanes.
-- - Restore parser/representation registry truth required by live FK constraints.
--
-- Intentionally out of scope in this migration:
-- - admin_runtime_policy routing changes
-- - ingest routing changes
-- - edge seam retirement
--
-- Why: supabase/functions/ingest still consumes admin_runtime_policy as a
-- docling-only routing source. Widening those policy rows here would reawaken
-- the wrong runtime path before ingest itself is rebaselined.

-- ---------------------------------------------------------------------------
-- 1. Create parser/representation registries if missing and restore their rows
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.registry_parsing_tools (
  parsing_tool TEXT NOT NULL,
  description TEXT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (parsing_tool)
);

CREATE TABLE IF NOT EXISTS public.registry_representation_types (
  representation_type TEXT NOT NULL,
  description TEXT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (representation_type)
);

INSERT INTO public.registry_parsing_tools (parsing_tool, description, sort_order)
VALUES
  ('tree_sitter', 'Tree-sitter AST parser for source code', 1),
  ('docling', 'Docling document conversion parser for rich document formats', 2),
  ('mdast', 'Markdown AST parser for markdown-native sources', 3),
  ('pandoc', 'Pandoc alpha parser for selected markup/document formats', 4)
ON CONFLICT (parsing_tool) DO UPDATE
SET description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- 2. Restore registry truth for representation types referenced by live writes
-- ---------------------------------------------------------------------------

INSERT INTO public.registry_representation_types (representation_type, description, sort_order)
VALUES
  ('markdown_bytes', 'Canonical markdown artifact bytes', 1),
  ('doclingdocument_json', 'Docling document JSON artifact', 2),
  ('mdast_json', 'Markdown AST JSON artifact', 3),
  ('html_bytes', 'Docling HTML export bytes', 4),
  ('doctags_text', 'Docling DocTags export text', 5),
  ('pandoc_ast_json', 'Pandoc AST JSON artifact', 6),
  ('citations_json', 'Structured citation extraction artifact', 7),
  ('tree_sitter_ast_json', 'Tree-sitter full AST as JSON', 10),
  ('tree_sitter_symbols_json', 'Tree-sitter extracted symbols as JSON', 11)
ON CONFLICT (representation_type) DO UPDATE
SET description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- 3. Reconcile conversion table foreign keys to the registry tables if needed
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversion_parsing_conv_parsing_tool_fkey'
      AND conrelid = 'public.conversion_parsing'::regclass
  ) THEN
    ALTER TABLE public.conversion_parsing
      ADD CONSTRAINT conversion_parsing_conv_parsing_tool_fkey
      FOREIGN KEY (conv_parsing_tool)
      REFERENCES public.registry_parsing_tools(parsing_tool);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversion_parsing_conv_representation_type_fkey'
      AND conrelid = 'public.conversion_parsing'::regclass
  ) THEN
    ALTER TABLE public.conversion_parsing
      ADD CONSTRAINT conversion_parsing_conv_representation_type_fkey
      FOREIGN KEY (conv_representation_type)
      REFERENCES public.registry_representation_types(representation_type);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversion_representations_parsing_tool_fkey'
      AND conrelid = 'public.conversion_representations'::regclass
  ) THEN
    ALTER TABLE public.conversion_representations
      ADD CONSTRAINT conversion_representations_parsing_tool_fkey
      FOREIGN KEY (parsing_tool)
      REFERENCES public.registry_parsing_tools(parsing_tool);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversion_representations_representation_type_fkey'
      AND conrelid = 'public.conversion_representations'::regclass
  ) THEN
    ALTER TABLE public.conversion_representations
      ADD CONSTRAINT conversion_representations_representation_type_fkey
      FOREIGN KEY (representation_type)
      REFERENCES public.registry_representation_types(representation_type);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Widen conversion_representations so live Platform API /parse writes land
-- ---------------------------------------------------------------------------

ALTER TABLE public.conversion_representations
  DROP CONSTRAINT IF EXISTS conversion_representations_pairing;

ALTER TABLE public.conversion_representations
  ADD CONSTRAINT conversion_representations_pairing CHECK (
    (parsing_tool = 'docling' AND representation_type IN (
      'markdown_bytes',
      'doclingdocument_json',
      'html_bytes',
      'doctags_text',
      'citations_json'
    ))
    OR
    (parsing_tool = 'tree_sitter' AND representation_type IN (
      'tree_sitter_ast_json',
      'tree_sitter_symbols_json'
    ))
    OR
    (parsing_tool = 'mdast' AND representation_type IN (
      'mdast_json',
      'markdown_bytes'
    ))
    OR
    (parsing_tool = 'pandoc' AND representation_type IN (
      'pandoc_ast_json'
    ))
  );

ALTER TABLE public.conversion_representations
  DROP CONSTRAINT IF EXISTS conversion_representations_v2_parsing_tool_check;

ALTER TABLE public.conversion_representations
  ADD CONSTRAINT conversion_representations_v2_parsing_tool_check
  CHECK (parsing_tool IN ('docling', 'tree_sitter', 'mdast', 'pandoc'));

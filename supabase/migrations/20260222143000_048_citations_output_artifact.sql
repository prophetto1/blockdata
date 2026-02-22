-- Migration 048: citations output artifact support
-- Adds citations_json as a first-class representation artifact.

INSERT INTO public.representation_type_catalog (representation_type, description, sort_order)
VALUES
  ('citations_json', 'Citation extraction output payload (eyecite)', 6)
ON CONFLICT (representation_type) DO UPDATE
SET
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

ALTER TABLE public.conversion_representations
  DROP CONSTRAINT IF EXISTS conversion_representations_pairing;

ALTER TABLE public.conversion_representations
  ADD CONSTRAINT conversion_representations_pairing CHECK (
    (parsing_tool = 'mdast' AND representation_type IN ('markdown_bytes', 'citations_json')) OR
    (parsing_tool = 'docling' AND representation_type IN ('doclingdocument_json', 'html_bytes', 'doctags_text', 'citations_json')) OR
    (parsing_tool = 'pandoc' AND representation_type IN ('pandoc_ast_json', 'citations_json'))
  );

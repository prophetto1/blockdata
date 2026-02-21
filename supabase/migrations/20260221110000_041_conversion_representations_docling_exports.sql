-- Migration 041: add docling export artifact types (html/doctags) for parse outputs tab

INSERT INTO public.representation_type_catalog (representation_type, description, sort_order)
VALUES
  ('html_bytes', 'Docling HTML export bytes', 4),
  ('doctags_text', 'Docling DocTags export text', 5)
ON CONFLICT (representation_type) DO UPDATE
SET
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

ALTER TABLE public.conversion_representations
  DROP CONSTRAINT IF EXISTS conversion_representations_pairing;

ALTER TABLE public.conversion_representations
  ADD CONSTRAINT conversion_representations_pairing CHECK (
    (parsing_tool = 'mdast' AND representation_type = 'markdown_bytes') OR
    (parsing_tool = 'docling' AND representation_type IN ('doclingdocument_json', 'html_bytes', 'doctags_text')) OR
    (parsing_tool = 'pandoc' AND representation_type = 'pandoc_ast_json')
  );

-- Migration 076: Seed pandoc parsing profiles.
-- Same table as docling (parsing_profiles), parser = 'pandoc'.

INSERT INTO public.parsing_profiles (parser, config) VALUES
(
  'pandoc',
  '{
    "name": "Default",
    "description": "Standard conversion with smart typography. Good for most markup formats.",
    "is_default": true,
    "from": null,
    "to": "json",
    "extensions": { "smart": true },
    "reader": { "tab_stop": 4 },
    "writer": { "wrap": "none" },
    "sandbox": true
  }'
),
(
  'pandoc',
  '{
    "name": "Academic LaTeX",
    "description": "LaTeX input with citation processing. For academic papers and theses.",
    "from": "latex",
    "to": "json",
    "extensions": {
      "smart": true,
      "tex_math_dollars": true,
      "citations": true,
      "footnotes": true,
      "auto_identifiers": true
    },
    "reader": { "tab_stop": 4 },
    "writer": { "wrap": "none" },
    "citations": {
      "citeproc": true,
      "cite_method": "citeproc"
    },
    "sandbox": true
  }'
),
(
  'pandoc',
  '{
    "name": "RST Documentation",
    "description": "reStructuredText input. For Sphinx docs, Python projects, technical writing.",
    "from": "rst",
    "to": "json",
    "extensions": { "smart": true },
    "reader": { "tab_stop": 4 },
    "writer": { "wrap": "none" },
    "sandbox": true
  }'
),
(
  'pandoc',
  '{
    "name": "EPUB Books",
    "description": "EPUB input extraction. For e-books and long-form published content.",
    "from": "epub",
    "to": "json",
    "extensions": { "smart": true },
    "reader": { "tab_stop": 4 },
    "writer": { "wrap": "none" },
    "sandbox": true
  }'
),
(
  'pandoc',
  '{
    "name": "DOCX with Track Changes",
    "description": "Word documents preserving tracked changes and custom styles.",
    "from": "docx+styles",
    "to": "json",
    "extensions": { "smart": true },
    "reader": { "track_changes": "all", "tab_stop": 4 },
    "writer": { "wrap": "none" },
    "sandbox": true
  }'
),
(
  'pandoc',
  '{
    "name": "Org-mode",
    "description": "Emacs Org-mode input. For org files, agendas, literate programming.",
    "from": "org",
    "to": "json",
    "extensions": { "smart": true, "citations": true },
    "reader": { "tab_stop": 4 },
    "writer": { "wrap": "none" },
    "sandbox": true
  }'
),
(
  'pandoc',
  '{
    "name": "Wiki Import",
    "description": "MediaWiki markup. For importing Wikipedia and wiki content.",
    "from": "mediawiki",
    "to": "json",
    "extensions": { "smart": true },
    "reader": { "tab_stop": 4 },
    "writer": { "wrap": "none" },
    "sandbox": true
  }'
),
(
  'pandoc',
  '{
    "name": "Typst",
    "description": "Typst markup. Modern alternative to LaTeX.",
    "from": "typst",
    "to": "json",
    "extensions": { "smart": true },
    "reader": { "tab_stop": 4 },
    "writer": { "wrap": "none" },
    "sandbox": true
  }'
);

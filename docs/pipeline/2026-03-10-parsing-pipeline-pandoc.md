# Parsing Pipeline — Pandoc Integration

> 2026-03-10 — Pandoc as markup-to-markup conversion backend.

## Scope

Pandoc handles what Docling doesn't: text-native markup formats where OCR, layout analysis, and vision models are irrelevant. RST, LaTeX, Org, MediaWiki, EPUB, ODT, RTF, Typst, DocBook, Textile, Djot, Jupyter notebooks, BibTeX.

DOCX, HTML, Markdown, LaTeX, AsciiDoc, JATS, and CSV overlap with Docling — routed by use case (Docling for structure extraction from complex layouts, Pandoc for markup fidelity).

---

## 1. Format → Capability Mapping

### Pandoc-exclusive formats (Docling can't handle)

| Format | Extensions | Input | Output | Notes |
|--------|-----------|-------|--------|-------|
| RST | .rst | Yes | Yes | reStructuredText |
| Org | .org | Yes | Yes | Emacs Org-mode |
| MediaWiki | — | Yes | Yes | Wikipedia markup |
| Typst | .typ | Yes | Yes | Modern typesetting |
| EPUB | .epub | Yes | Yes | E-book format |
| ODT | .odt | Yes | Yes | OpenDocument Text |
| RTF | .rtf | Yes | No | Read only (write via LaTeX) |
| DocBook | .xml | Yes | No | DocBook XML |
| Textile | — | Yes | Yes | Textile markup |
| DokuWiki | — | Yes | Yes | DokuWiki markup |
| Djot | .djot | Yes | Yes | Modern lightweight markup |
| Jupyter | .ipynb | Yes | Yes | Notebook format |
| BibTeX | .bib | Yes | Yes | Bibliography |
| BibLaTeX | .bib | Yes | Yes | Bibliography (extended) |
| Haddock | — | Yes | Yes | Haskell docs |
| Muse | — | Yes | Yes | Emacs Muse |
| TWiki | — | Yes | No | TWiki markup |
| TikiWiki | — | Yes | No | TikiWiki markup |
| Creole | — | Yes | No | Wiki Creole |
| Vimwiki | — | Yes | No | Vimwiki markup |
| Pod | — | Yes | No | Perl POD |
| t2t | — | Yes | No | txt2tags |
| FB2 | .fb2 | Yes | Yes | FictionBook |
| OPML | .opml | Yes | Yes | Outline format |
| CSL JSON | .json | Yes | Yes | Citation data |
| RIS | .ris | Yes | No | Citation data |
| EndNote XML | .xml | Yes | No | Citation data |

### Overlap formats (also handled by Docling)

| Format | When to use Pandoc | When to use Docling |
|--------|-------------------|---------------------|
| DOCX | Markup fidelity, track changes | Table/layout extraction |
| HTML | Clean markup conversion | Complex web pages with images |
| Markdown | Variant conversion (GFM↔CommonMark↔MMD) | N/A (mdast track) |
| LaTeX | Full LaTeX→anything conversion | PDF extraction from .tex |
| AsciiDoc | Markup conversion | N/A |
| JATS XML | Markup conversion | N/A |
| CSV | As table data | N/A |

### Output-only formats (Pandoc writes but doesn't read)

| Format | Notes |
|--------|-------|
| PDF | Via LaTeX/Typst/WeasyPrint/wkhtmltopdf engine |
| Beamer | LaTeX slides |
| reveal.js | HTML slides |
| Slidy/Slideous/DZSlides/S5 | HTML slide formats |
| man/mdoc | Unix manual pages |
| Texinfo | GNU Info |
| ICML | Adobe InDesign |
| ConTeXt | TeX variant |
| ms | groff ms |
| TEI | Text Encoding Initiative |
| BBCode | Forum markup (multiple dialects) |
| XWiki/ZimWiki | Wiki formats |
| Markua | Leanpub |
| Chunked HTML | Split HTML output |
| vimdoc | Vim help |

---

## 2. Full jsonb Schema

```jsonc
{
  // ═══════════════════════════════════════════════════════════════════
  // FORMAT SELECTION
  // ═══════════════════════════════════════════════════════════════════

  "from": "markdown",
  // Input format. Any pandoc reader name.
  // Can include extensions: "markdown+emoji-smart"
  // Common values: "markdown", "rst", "latex", "org", "html", "docx",
  //   "epub", "mediawiki", "typst", "docbook", "textile", "djot",
  //   "commonmark", "commonmark_x", "gfm", "markdown_mmd",
  //   "markdown_phpextra", "markdown_strict", "ipynb", "odt",
  //   "bibtex", "biblatex", "csljson", "ris", "fb2", "opml",
  //   "haddock", "muse", "creole", "jira", "t2t", "pod", "rtf",
  //   "csv", "tsv", "xlsx"

  "to": "json",
  // Output format. Our pipeline always outputs pandoc AST JSON
  // for downstream processing, but profiles can target other formats
  // for export use cases.
  // Common values: "json" (AST), "markdown", "html", "latex",
  //   "docx", "epub", "typst", "rst", "org", "plain", "pdf"

  // ═══════════════════════════════════════════════════════════════════
  // EXTENSIONS
  // Modify reader/writer behavior. Applied to from/to format string.
  // ═══════════════════════════════════════════════════════════════════

  "extensions": {
    // Each key is an extension name. Value is true (enable) or false (disable).
    // Only extensions that differ from the format's defaults need to be listed.
    // Omitted extensions use the format's built-in defaults.

    // ─── Typography ───────────────────────────────────────────────
    "smart": null,                  // Smart quotes, dashes, ellipses
    // Enabled by default in: markdown, commonmark_x, gfm

    // ─── Headings ─────────────────────────────────────────────────
    "auto_identifiers": null,       // Auto-generate header IDs
    "ascii_identifiers": null,      // ASCII-only header IDs
    "gfm_auto_identifiers": null,   // GitHub-style header IDs
    "header_attributes": null,      // {#id .class key=value} on headers

    // ─── Math ─────────────────────────────────────────────────────
    "tex_math_dollars": null,       // $...$ and $$...$$
    "tex_math_gfm": null,           // GFM math syntax
    "tex_math_single_backslash": null,  // \(...\) and \[...\]
    "tex_math_double_backslash": null,  // \\(...\\) and \\[...\\]
    "latex_macros": null,           // Parse LaTeX macros

    // ─── Raw content ──────────────────────────────────────────────
    "raw_html": null,               // Allow raw HTML
    "raw_tex": null,                // Allow raw LaTeX/TeX
    "raw_attribute": null,          // Explicit raw blocks/inlines

    // ─── Code blocks ──────────────────────────────────────────────
    "fenced_code_blocks": null,     // ~~~ or ``` fenced code
    "backtick_code_blocks": null,   // Backtick fenced code
    "fenced_code_attributes": null, // Attributes on fenced blocks
    "inline_code_attributes": null, // Attributes on inline code

    // ─── HTML integration ─────────────────────────────────────────
    "native_divs": null,            // Parse <div> as Div blocks
    "native_spans": null,           // Parse <span> as Span inlines
    "markdown_in_html_blocks": null,// Markdown inside HTML blocks
    "empty_paragraphs": null,       // Allow empty paragraphs

    // ─── Lists ────────────────────────────────────────────────────
    "fancy_lists": null,            // Letters, roman numerals, parens
    "startnum": null,               // Respect starting number
    "definition_lists": null,       // Definition list syntax
    "example_lists": null,          // Numbered example lists
    "task_lists": null,             // GitHub-style task lists

    // ─── Tables ───────────────────────────────────────────────────
    "pipe_tables": null,            // | col | col | syntax
    "simple_tables": null,          // Pandoc simple tables
    "multiline_tables": null,       // Pandoc multiline tables
    "grid_tables": null,            // Pandoc grid tables
    "table_captions": null,         // Table captions
    "table_attributes": null,       // Attributes after caption

    // ─── Inline formatting ────────────────────────────────────────
    "footnotes": null,              // Footnote syntax
    "inline_notes": null,           // Inline footnotes
    "citations": null,              // Native pandoc citations
    "strikeout": null,              // ~~strikethrough~~
    "superscript": null,            // ^superscript^
    "subscript": null,              // ~subscript~
    "mark": null,                   // ==highlight==
    "bracketed_spans": null,        // [text]{.class}
    "fenced_divs": null,            // ::: div syntax
    "link_attributes": null,        // Attributes on links/images
    "implicit_figures": null,       // Lone image → figure
    "emoji": null,                  // :smile: emoji codes

    // ─── Metadata ─────────────────────────────────────────────────
    "yaml_metadata_block": null,    // YAML metadata at doc start
    "pandoc_title_block": null,     // % Title / % Author / % Date
    "mmd_title_block": null,        // MultiMarkdown title block

    // ─── Line handling ────────────────────────────────────────────
    "hard_line_breaks": null,       // All newlines → hard breaks
    "escaped_line_breaks": null,    // Backslash → hard break
    "ignore_line_breaks": null,     // Ignore newlines in paragraphs
    "east_asian_line_breaks": null, // Ignore newlines between CJK

    // ─── Misc ─────────────────────────────────────────────────────
    "intraword_underscores": null,  // _ inside words is literal
    "all_symbols_escapable": null,  // All non-alphanumerics escapable
    "literate_haskell": null,       // Literate Haskell conventions
    "sourcepos": null,              // Include source positions
    "wikilinks_title_after_pipe": null,   // [[target|title]]
    "wikilinks_title_before_pipe": null,  // [[title|target]]
    "autolink_bare_uris": null,     // Bare URLs become links
    "rebase_relative_paths": null,  // Rebase relative paths
    "alerts": null,                 // GFM alert blocks

    // ─── Format-specific ──────────────────────────────────────────
    "styles": null,                 // (docx) Parse custom styles
    "native_numbering": null,       // (odt/docx) Native numbering
    "element_citations": null,      // (jats) element-citation
    "ntb": null,                    // (context) Natural Tables
    "tagging": null,                // (context) Tagged PDF
    "raw_markdown": null,           // (ipynb) Raw markdown cells
    "gutenberg": null               // Project Gutenberg conventions
  },

  // ═══════════════════════════════════════════════════════════════════
  // READER OPTIONS
  // ═══════════════════════════════════════════════════════════════════

  "reader": {
    "standalone": false,
    // bool — parse as standalone document (include header/footer info)

    "columns": 80,
    // int — assumed terminal width for line-wrapping input formats

    "tab_stop": 4,
    // int — spaces per tab

    "default_image_extension": "",
    // string — default extension for images without one (e.g. "png")

    "indented_code_classes": [],
    // string[] — default classes for indented code blocks

    "track_changes": "accept",
    // "accept" | "reject" | "all"
    // How to handle DOCX track changes.

    "strip_comments": false,
    // bool — strip HTML comments instead of treating as raw HTML

    "abbreviations": null
    // string | null — path to custom abbreviations file
  },

  // ═══════════════════════════════════════════════════════════════════
  // WRITER OPTIONS
  // ═══════════════════════════════════════════════════════════════════

  "writer": {

    // ─── Text formatting ──────────────────────────────────────────
    "wrap": "auto",
    // "auto" | "none" | "preserve"

    "columns": 72,
    // int — line width for wrapping

    "tab_stop": 4,
    // int — spaces per tab in output

    "ascii": false,
    // bool — prefer ASCII output (escape unicode)

    "eol": "native",
    // "lf" | "crlf" | "native"

    // ─── Document structure ───────────────────────────────────────
    "standalone": false,
    // bool — produce standalone document with header/footer

    "toc": false,
    // bool — include table of contents

    "toc_depth": 3,
    // int (1-6) — depth of TOC

    "lof": false,
    // bool — include list of figures

    "lot": false,
    // bool — include list of tables

    "number_sections": false,
    // bool — number section headings

    "number_offset": [0, 0, 0, 0, 0, 0],
    // int[6] — starting numbers for each heading level

    "top_level_division": "default",
    // "default" | "section" | "chapter" | "part"

    "shift_heading_level_by": 0,
    // int — shift all heading levels by N (can be negative)

    "section_divs": false,
    // bool — wrap sections in <div> (HTML output)

    // ─── Markdown output ──────────────────────────────────────────
    "markdown_headings": "atx",
    // "atx" | "setext"

    "reference_links": false,
    // bool — use reference-style links in markdown/rst output

    "reference_location": "document",
    // "block" | "section" | "document"
    // Where to place footnotes/references

    // ─── Caption positioning ──────────────────────────────────────
    "figure_caption_position": "below",
    // "above" | "below"

    "table_caption_position": "above",
    // "above" | "below"

    // ─── HTML output ──────────────────────────────────────────────
    "html_math_method": {
      "method": "plain",
      // "plain" | "mathjax" | "katex" | "mathml" | "webtex" | "gladtex"
      "url": null
      // string | null — URL for mathjax/katex/webtex service
    },

    "html_q_tags": false,
    // bool — use <q> tags for quotes

    "email_obfuscation": "none",
    // "none" | "javascript" | "references"

    "id_prefix": "",
    // string — prefix for HTML identifiers

    "embed_resources": false,
    // bool — embed CSS/JS resources inline

    // ─── Syntax highlighting ──────────────────────────────────────
    "syntax_highlighting": "default",
    // "none" | "default" | "idiomatic" | <style-name> | <theme-path>

    "dpi": 96,
    // int — pixels per inch for image sizing

    // ─── Slide output ─────────────────────────────────────────────
    "slide_level": null,
    // int (0-6) | null — header level that creates slides

    "incremental": false,
    // bool — incremental lists in slide shows

    // ─── RST output ──────────────────────────────────────────────
    "list_tables": false,
    // bool — use list tables in RST output

    // ─── Jupyter output ───────────────────────────────────────────
    "ipynb_output": "best",
    // "all" | "none" | "best"

    // ─── ODT output ──────────────────────────────────────────────
    "link_images": false
    // bool — link images in ODT instead of embedding
  },

  // ═══════════════════════════════════════════════════════════════════
  // METADATA
  // Applied to the document before conversion.
  // ═══════════════════════════════════════════════════════════════════

  "metadata": {},
  // object — key-value pairs merged into document metadata.
  // Values are parsed as YAML (strings, bools, lists, objects).
  // Example: { "lang": "en-US", "title": "My Document" }

  "variables": {},
  // object — template variables (always treated as strings).
  // Example: { "fontsize": "12pt", "documentclass": "article" }

  // ═══════════════════════════════════════════════════════════════════
  // CITATIONS & BIBLIOGRAPHY
  // ═══════════════════════════════════════════════════════════════════

  "citations": {
    "citeproc": false,
    // bool — run built-in citeproc citation processor

    "cite_method": "citeproc",
    // "citeproc" | "natbib" | "biblatex"
    // Which citation backend to use (natbib/biblatex for LaTeX output only)

    "bibliography": [],
    // string[] — paths to bibliography files (.bib, .json, .yaml)

    "csl": null,
    // string | null — path to CSL citation style file

    "citation_abbreviations": null
    // string | null — path to citation abbreviations file
  },

  // ═══════════════════════════════════════════════════════════════════
  // FILTERS
  // Applied in order during conversion.
  // ═══════════════════════════════════════════════════════════════════

  "filters": [],
  // Array of filter specs. Each element is either:
  //   - "citeproc" (built-in)
  //   - "path/to/filter.lua" (Lua filter)
  //   - { "type": "json", "path": "path/to/filter" } (JSON filter)
  //
  // Filters run in the order listed.

  // ═══════════════════════════════════════════════════════════════════
  // TEMPLATES & INCLUDES
  // ═══════════════════════════════════════════════════════════════════

  "template": null,
  // string | null — path to custom template file.
  // null = use pandoc's built-in default for the output format.

  "include_in_header": [],
  // string[] — files to include in document header

  "include_before_body": [],
  // string[] — files to include before document body

  "include_after_body": [],
  // string[] — files to include after document body

  "css": [],
  // string[] — CSS stylesheets (HTML/EPUB output)

  "reference_doc": null,
  // string | null — reference document for docx/odt/pptx styling

  // ═══════════════════════════════════════════════════════════════════
  // EPUB OPTIONS
  // ═══════════════════════════════════════════════════════════════════

  "epub": {
    "cover_image": null,
    // string | null — path to cover image

    "metadata": null,
    // string | null — path to EPUB metadata file

    "fonts": [],
    // string[] — font files to embed

    "subdirectory": "EPUB",
    // string — subdirectory name in OCF container

    "title_page": true,
    // bool — include title page

    "split_level": 1
    // int (1-6) — header level for chapter splitting
  },

  // ═══════════════════════════════════════════════════════════════════
  // PDF ENGINE OPTIONS
  // (only relevant when to = "pdf")
  // ═══════════════════════════════════════════════════════════════════

  "pdf": {
    "engine": "pdflatex",
    // "pdflatex" | "lualatex" | "xelatex" | "latexmk" | "tectonic"
    // | "weasyprint" | "wkhtmltopdf" | "pagedjs-cli" | "prince"
    // | "context" | "pdfroff" | "typst"

    "engine_opts": []
    // string[] — additional flags passed to the PDF engine
  },

  // ═══════════════════════════════════════════════════════════════════
  // MEDIA & RESOURCES
  // ═══════════════════════════════════════════════════════════════════

  "extract_media": null,
  // string | null — directory to extract embedded media into

  "resource_path": [],
  // string[] — search paths for images and resources

  // ═══════════════════════════════════════════════════════════════════
  // PROCESSING
  // ═══════════════════════════════════════════════════════════════════

  "file_scope": false,
  // bool — parse each input file independently before combining

  "sandbox": true,
  // bool — disable reading from network or absolute paths (security)

  "request_headers": [],
  // [string, string][] — HTTP headers for fetching remote resources.
  // Example: [["Authorization", "Bearer token123"]]

  "no_check_certificate": false
  // bool — skip TLS certificate validation for remote fetches
}
```

---

## 3. Seed Profiles

```sql
INSERT INTO public.parsing_profiles (parser, config) VALUES
(
  'pandoc',
  '{
    "name": "Pandoc Default",
    "description": "Standard conversion with smart typography. Good for most markup formats.",
    "is_default": true,
    "from": null,
    "to": "json",
    "extensions": { "smart": true },
    "reader": {},
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
      "footnotes": true
    },
    "reader": {},
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
    "reader": {},
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
    "reader": {},
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
    "reader": { "track_changes": "all" },
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
    "reader": {},
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
    "reader": {},
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
    "reader": {},
    "writer": { "wrap": "none" },
    "sandbox": true
  }'
);
```

---

## 4. Translation Layer: jsonb → pandoc CLI

```typescript
/**
 * Translate platform jsonb config → pandoc command-line arguments.
 *
 * Pandoc is a CLI tool (Haskell binary), not a Python library.
 * We build an args array and shell out.
 */

interface PandocConfig {
  from?: string;
  to?: string;
  extensions?: Record<string, boolean | null>;
  reader?: Record<string, unknown>;
  writer?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  variables?: Record<string, string>;
  citations?: {
    citeproc?: boolean;
    cite_method?: string;
    bibliography?: string[];
    csl?: string | null;
    citation_abbreviations?: string | null;
  };
  filters?: Array<string | { type: string; path: string }>;
  template?: string | null;
  include_in_header?: string[];
  include_before_body?: string[];
  include_after_body?: string[];
  css?: string[];
  reference_doc?: string | null;
  epub?: Record<string, unknown>;
  pdf?: { engine?: string; engine_opts?: string[] };
  extract_media?: string | null;
  resource_path?: string[];
  file_scope?: boolean;
  sandbox?: boolean;
}

function buildPandocArgs(config: PandocConfig, inputPath: string): string[] {
  const args: string[] = [];

  // ── Format with extensions ──
  let fromFormat = config.from ?? 'markdown';
  let toFormat = config.to ?? 'json';

  if (config.extensions) {
    const extStr = Object.entries(config.extensions)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => `${v ? '+' : '-'}${k}`)
      .join('');
    fromFormat += extStr;
  }

  args.push('--from', fromFormat);
  args.push('--to', toFormat);

  // ── Reader options ──
  const r = config.reader ?? {};
  if (r.standalone) args.push('--standalone');
  if (r.columns) args.push('--columns', String(r.columns));
  if (r.tab_stop) args.push('--tab-stop', String(r.tab_stop));
  if (r.default_image_extension) args.push('--default-image-extension', String(r.default_image_extension));
  if (r.track_changes && r.track_changes !== 'accept') args.push('--track-changes', String(r.track_changes));
  if (r.strip_comments) args.push('--strip-comments');
  if (r.indented_code_classes?.length) args.push('--indented-code-classes', (r.indented_code_classes as string[]).join(','));

  // ── Writer options ──
  const w = config.writer ?? {};
  if (w.wrap) args.push('--wrap', String(w.wrap));
  if (w.columns) args.push('--columns', String(w.columns));
  if (w.tab_stop) args.push('--tab-stop', String(w.tab_stop));
  if (w.ascii) args.push('--ascii');
  if (w.standalone) args.push('--standalone');
  if (w.toc) args.push('--toc');
  if (w.toc_depth) args.push('--toc-depth', String(w.toc_depth));
  if (w.number_sections) args.push('--number-sections');
  if (w.shift_heading_level_by) args.push('--shift-heading-level-by', String(w.shift_heading_level_by));
  if (w.section_divs) args.push('--section-divs');
  if (w.reference_links) args.push('--reference-links');
  if (w.reference_location && w.reference_location !== 'document') args.push('--reference-location', String(w.reference_location));
  if (w.markdown_headings && w.markdown_headings !== 'atx') args.push('--markdown-headings', String(w.markdown_headings));
  if (w.incremental) args.push('--incremental');
  if (w.slide_level) args.push('--slide-level', String(w.slide_level));
  if (w.embed_resources) args.push('--embed-resources');
  if (w.id_prefix) args.push('--id-prefix', String(w.id_prefix));
  if (w.dpi && w.dpi !== 96) args.push('--dpi', String(w.dpi));
  if (w.eol && w.eol !== 'native') args.push('--eol', String(w.eol));
  if (w.list_tables) args.push('--list-tables');
  if (w.link_images) args.push('--link-images');
  if (w.ipynb_output && w.ipynb_output !== 'best') args.push('--ipynb-output', String(w.ipynb_output));

  // Math method
  const math = w.html_math_method as { method?: string; url?: string | null } | undefined;
  if (math?.method && math.method !== 'plain') {
    if (math.url) {
      args.push(`--${math.method}=${math.url}`);
    } else {
      args.push(`--${math.method}`);
    }
  }

  // Syntax highlighting
  if (w.syntax_highlighting && w.syntax_highlighting !== 'default') {
    args.push('--syntax-highlighting', String(w.syntax_highlighting));
  }

  // ── Metadata ──
  if (config.metadata) {
    for (const [k, v] of Object.entries(config.metadata)) {
      args.push('--metadata', `${k}=${v}`);
    }
  }

  // ── Variables ──
  if (config.variables) {
    for (const [k, v] of Object.entries(config.variables)) {
      args.push('--variable', `${k}=${v}`);
    }
  }

  // ── Citations ──
  const cit = config.citations ?? {};
  if (cit.citeproc) args.push('--citeproc');
  if (cit.cite_method === 'natbib') args.push('--natbib');
  if (cit.cite_method === 'biblatex') args.push('--biblatex');
  if (cit.bibliography) {
    for (const bib of cit.bibliography) {
      args.push('--bibliography', bib);
    }
  }
  if (cit.csl) args.push('--csl', cit.csl);
  if (cit.citation_abbreviations) args.push('--citation-abbreviations', cit.citation_abbreviations);

  // ── Filters ──
  if (config.filters) {
    for (const f of config.filters) {
      if (f === 'citeproc') {
        args.push('--citeproc');
      } else if (typeof f === 'string') {
        args.push('--lua-filter', f);
      } else {
        args.push('--filter', f.path);
      }
    }
  }

  // ── Template & includes ──
  if (config.template) args.push('--template', config.template);
  for (const h of config.include_in_header ?? []) args.push('--include-in-header', h);
  for (const b of config.include_before_body ?? []) args.push('--include-before-body', b);
  for (const a of config.include_after_body ?? []) args.push('--include-after-body', a);
  for (const c of config.css ?? []) args.push('--css', c);
  if (config.reference_doc) args.push('--reference-doc', config.reference_doc);

  // ── EPUB ──
  const epub = config.epub ?? {};
  if (epub.cover_image) args.push('--epub-cover-image', String(epub.cover_image));
  if (epub.metadata) args.push('--epub-metadata', String(epub.metadata));
  if (epub.fonts) {
    for (const font of epub.fonts as string[]) {
      args.push('--epub-embed-font', font);
    }
  }
  if (epub.title_page === false) args.push('--no-epub-title-page');
  if (epub.split_level && epub.split_level !== 1) args.push('--split-level', String(epub.split_level));

  // ── PDF ──
  const pdf = config.pdf ?? {};
  if (pdf.engine) args.push('--pdf-engine', pdf.engine);
  if (pdf.engine_opts) {
    for (const opt of pdf.engine_opts) {
      args.push('--pdf-engine-opt', opt);
    }
  }

  // ── Media & resources ──
  if (config.extract_media) args.push('--extract-media', config.extract_media);
  if (config.resource_path?.length) args.push('--resource-path', config.resource_path.join(':'));

  // ── Processing ──
  if (config.file_scope) args.push('--file-scope');
  if (config.sandbox) args.push('--sandbox');

  // ── Input ──
  args.push(inputPath);

  return args;
}
```

---

## 5. Service Architecture

```
Pandoc is a Haskell binary — not a Python library.
The conversion service shells out to the pandoc CLI.

services/
  pandoc-convert/
    convert.ts        # buildPandocArgs() + child_process.execFile
    main.ts           # HTTP handler (Express/Hono)
    Dockerfile        # pandoc binary + Node runtime
```

### Request flow

```
User picks profile (or uses default) → clicks Run
  → POST /convert { source_uid, pipeline_config: {...} }
  → Edge function forwards to pandoc conversion service
  → buildPandocArgs(config) → execFile('pandoc', args)
  → Pandoc AST JSON output → callback with parsed blocks
  → pipeline_config saved to conversion_parsing.pipeline_config
```

---

## 6. Dependencies

| Component | Install | Notes |
|-----------|---------|-------|
| Pandoc binary | `apt-get install pandoc` or GitHub release | Core requirement. v3.6+ |
| Citeproc | Built into pandoc | No extra install |
| LaTeX (for PDF) | `apt-get install texlive-xetex` | Only if PDF output needed |
| Typst (for PDF) | `apt-get install typst` | Alternative PDF engine |
| WeasyPrint (for PDF) | `pip install weasyprint` | HTML→PDF engine |

### Minimum install

```bash
apt-get install pandoc  # That's it. Single binary.
```

### Full install (with PDF engines)

```bash
apt-get install pandoc texlive-xetex texlive-fonts-recommended
# Optional: typst, weasyprint, wkhtmltopdf
```

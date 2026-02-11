---
title: Parsing Tracks
description: The three parsing tracks, format routing, and capability comparison.
sidebar:
  order: 2
---

**Spec version:** v1.0
**Date:** 2026-02-11
**Source:** `docs/specs/block-types-and-parsing-tracks.md`
**Status:** mdast and docling tracks are live; pandoc is spec only

---

## Scope

This page defines the three parsing tracks (mdast, docling, pandoc), their format routing, and their structural capabilities.

It does **not** cover: block type normalization (see [Block Types](/docs/blocks/block-types/)) or field definitions (see [Immutable Fields](/docs/schemas/immutable-schema/)).

---

<!-- BEGIN VERBATIM COPY from docs/specs/block-types-and-parsing-tracks.md (tracks, formats, capabilities sections) -->

## Parsing Tracks

| Track | Source types | `conv_parsing_tool` | `conv_representation_type` | `block_locator.type` | Status |
|---|---|---|---|---|---|
| mdast | `.md` | `mdast` | `markdown_bytes` | `text_offset_range` | Live |
| docling | `.docx`, `.pdf` | `docling` | `doclingdocument_json` | `docling_json_pointer` | Live |
| pandoc | `.txt`, `.docx`, `.epub`, `.odt`, `.rst`, `.latex`, `.html`, and others | `pandoc` | `pandoc_ast_json` | `pandoc_ast_path` | Spec only |

### mdast track

Markdown files are parsed inline in the Edge Function using remark/mdast. No conversion service is involved. Blocks get `text_offset_range` locators (byte offsets into the raw markdown).

### docling track

DOCX and PDF files are sent to the Cloud Run conversion service where Docling converts them into markdown + a Docling JSON sidecar (`DoclingDocument`). Blocks get `docling_json_pointer` locators (e.g. `#/texts/0`) pointing into the Docling JSON representation.

### pandoc track

Not yet implemented. Pandoc is a universal document converter with native readers for a wide range of formats:

- **Text/Markup:** Markdown, reStructuredText, Textile, Org-mode, MediaWiki, AsciiDoc, LaTeX, OPML
- **Documents:** DOCX, ODT, EPUB, DocBook, JATS, TEI
- **Web:** HTML, XHTML
- **Other:** man pages, Jupyter notebooks, BibTeX, BibLaTeX, txt2tags

Blocks would get `pandoc_ast_path` locators pointing into the Pandoc AST JSON. Requires adding Pandoc (Haskell binary) as a dependency in the conversion service.

Note: Pandoc overlaps with Docling on `.docx` and `.html`. Docling is stronger for layout-rich formats (PDFs with tables/figures/page furniture), while Pandoc is stronger for text-centric and markup formats (`.rst`, `.latex`, `.epub`, `.odt`, `.txt`). Both produce structured ASTs suitable for block extraction.

## Supported Formats: Docling vs Pandoc

Source: `ref-repos/docling/docling/datamodel/base_models.py` (InputFormat enum, lines 55-100) and `ref-repos/pandoc/src/Text/Pandoc/Readers.hs` (readers list, lines 138-185).

### Full format comparison

| Format | Extensions | Docling | Pandoc | Overlap |
|---|---|---|---|---|
| **PDF** | `.pdf` | Yes | - | |
| **Word** | `.docx`, `.dotx`, `.docm`, `.dotm` | Yes | Yes | **overlap** |
| **PowerPoint** | `.pptx`, `.potx`, `.ppsx`, `.pptm`, `.potm`, `.ppsm` | Yes | - | |
| **Excel** | `.xlsx`, `.xlsm` | Yes | - | |
| **HTML** | `.html`, `.htm`, `.xhtml` | Yes | Yes | **overlap** |
| **CSV** | `.csv` | Yes | Yes | **overlap** |
| **Markdown** | `.md` | Yes | Yes | **overlap** |
| **AsciiDoc** | `.adoc`, `.asciidoc`, `.asc` | Yes | - | |
| **Image** | `.jpg`, `.jpeg`, `.png`, `.tif`, `.tiff`, `.bmp`, `.webp` | Yes (OCR) | - | |
| **Audio/Video** | `.wav`, `.mp3`, `.m4a`, `.aac`, `.ogg`, `.flac`, `.mp4`, `.avi`, `.mov` | Yes (transcription) | - | |
| **WebVTT** | `.vtt` | Yes | - | |
| **JATS XML** | `.xml`, `.nxml` | Yes | Yes | **overlap** |
| **USPTO XML** | `.xml`, `.txt` | Yes | - | |
| **METS/GBS** | `.tar.gz` | Yes | - | |
| **Docling JSON** | `.json` | Yes (re-import) | - | |
| **ODT** | `.odt` | - | Yes | |
| **EPUB** | `.epub` | - | Yes | |
| **LaTeX** | `.tex`, `.latex` | - | Yes | |
| **reStructuredText** | `.rst` | - | Yes | |
| **Org-mode** | `.org` | - | Yes | |
| **Textile** | `.textile` | - | Yes | |
| **MediaWiki** | `.wiki` | - | Yes | |
| **TikiWiki** | - | - | Yes | |
| **TWiki** | - | - | Yes | |
| **Creole** | - | - | Yes | |
| **Djot** | `.djot` | - | Yes | |
| **Typst** | `.typ` | - | Yes | |
| **DocBook XML** | `.xml` | - | Yes | |
| **OPML** | `.opml` | - | Yes | |
| **Muse** | `.muse` | - | Yes | |
| **VimWiki** | - | - | Yes | |
| **txt2tags** | `.t2t` | - | Yes | |
| **Haddock** | - | - | Yes | |
| **man page** | `.1`, `.2`, etc. | - | Yes | |
| **RTF** | `.rtf` | - | Yes | |
| **FictionBook** | `.fb2` | - | Yes | |
| **Jupyter Notebook** | `.ipynb` | - | Yes | |
| **Jira wiki** | - | - | Yes | |
| **BibTeX** | `.bib` | - | Yes | |
| **BibLaTeX** | `.bib` | - | Yes | |
| **CSL JSON** | `.json` | - | Yes | |
| **EndNoteXML** | `.xml` | - | Yes | |
| **RIS** | `.ris` | - | Yes | |
| **TSV** | `.tsv` | - | Yes | |
| **Plain text** | `.txt` | - | No (treats as markdown) | |

### Summary

- **Docling only (15 formats):** PDF, PowerPoint, Excel, AsciiDoc, Image (OCR), Audio/Video (transcription), WebVTT, USPTO XML, METS/GBS, Docling JSON. Strongest for layout-rich, binary, and media formats.
- **Pandoc only (27 formats):** ODT, EPUB, LaTeX, RST, Org, Textile, MediaWiki, Djot, Typst, DocBook, RTF, FictionBook, Jupyter, Jira, BibTeX, BibLaTeX, man pages, and more. Strongest for text-centric markup and academic formats.
- **Overlap (5 formats):** DOCX, HTML, CSV, Markdown, JATS XML. Both tools can handle these. Docling preserves spatial/visual layout (page numbers, bounding boxes, table cell geometry, reading order across columns). Pandoc preserves richer structural semantics (citations, blockquotes, definition lists, inline markup types).

### Routing strategy

The current architecture routes `.md` through mdast (inline), `.docx`/`.pdf` through Docling. If Pandoc were added:

- Docling-only formats (PDF, PPTX, XLSX, Image, Audio) stay on the docling track.
- Pandoc-only formats (ODT, EPUB, LaTeX, RST, Org, RTF, etc.) go on the pandoc track.
- Overlap formats (DOCX, HTML) stay on Docling (spatial layout data), but Pandoc could serve as a fallback or complement (structural semantics like citations).
- Markdown stays on mdast (purpose-built, inline, no conversion service needed).

## Capability Comparison: Citations, Blockquotes, Section Nesting

### Citation handling

| Capability | mdast | Docling | Pandoc |
|---|---|---|---|
| Footnote content | Yes (`FootnoteDefinition`) | Yes (`FOOTNOTE` label) | Yes (`Note`) |
| Footnote inline marker | Yes (`FootnoteReference`) | No | Yes (inline in text) |
| Footnote linking (marker to content) | Yes (shared `identifier`) | No | Yes (structural) |
| Inline citation detection | **No** | **No** | **Yes** (`Cite` node) |
| Citation key extraction | **No** | **No** | **Yes** (`citationId`) |
| Citation mode (author-in-text vs parenthetical) | **No** | **No** | **Yes** (`CitationMode`) |
| Bibliography parsing | **No** | **No** | **Yes** (BibTeX, CSL, RIS, etc.) |

Pandoc is the only tool that can distinguish a citation from surrounding text. Its `Cite` inline node contains structured `Citation` objects with `citationId`, `citationPrefix`, `citationSuffix`, and `citationMode` (AuthorInText, SuppressAuthor, NormalCitation). Citations are inline nodes inside a `Para` block — they would not become separate blocks, but their metadata would be accessible within the `pandoc_ast_json` sidecar for the parent paragraph block.

mdast has no citation concept. `[@smith2020]` is just plain text inside a `Paragraph`. There is a community plugin (`remark-cite`) but it's not part of core mdast or GFM.

Docling has no citation concept. Inline citations are part of `PARAGRAPH` text. `FOOTNOTE` is a layout-detected region (text at bottom of page in smaller font) with no semantic linking to inline markers.

### Blockquote handling

| Tool | Blockquote awareness |
|---|---|
| mdast | Recognizes `Blockquote` nodes from `>` syntax, but our `extractBlocks` maps it to `other` (easy fix) |
| Docling | No concept — blockquotes are labeled `PARAGRAPH` regardless of formatting |
| Pandoc | First-class `BlockQuote` block node |

### Section/chapter nesting

None of the three tools produce section hierarchy by default for all formats.

| Tool | Format | Section nesting | How |
|---|---|---|---|
| mdast | Markdown | **No** | Flat siblings under Root; `Heading.depth` preserved but no tree |
| Docling | DOCX | **Yes** | Heading levels create nested `GroupLabel.SECTION` groups |
| Docling | PDF | **Yes** | Layout model detects section boundaries visually |
| Docling | Image (OCR) | **Yes** | Same as PDF pipeline |
| Docling | Markdown | **No** | Explicitly not implemented (comment in source: "section components not captured as heading children in marko") |
| Pandoc | All formats (default) | **No** | Flat `[Block]` list under `Pandoc Meta` |
| Pandoc | All formats (`--section-divs`) | **Yes** | Wraps sections in `Div` nodes based on heading depth |

mdast is a tree in the sense that `List` contains `ListItem` children and `Table` contains `TableRow` / `TableCell`. But headings and their content are flat siblings — markdown itself has no section container syntax.

Docling builds real section trees for DOCX and PDF (where the source format or layout model provides section boundaries) but not for markdown.

Pandoc can reconstruct section hierarchy from heading depth for any format, but only when `--section-divs` is enabled.

## Adding New Source Types

### Docling-supported formats

Adding these is trivial. To add `.pptx`, `.xlsx`, `.html`, or any other Docling-supported format:

1. Add the MIME type to the Storage bucket `allowed_mime_types`.
2. Add the extension in `detectSourceType()` (`.pptx` is already there).
3. Add it to the `if (source_type === "docx" || source_type === "pdf")` condition for the Docling JSON sidecar.

These formats go through the existing docling track with no new code paths.

### Pandoc-supported formats

Requires the pandoc track to be implemented. `.txt`, `.epub`, `.odt`, `.rst`, `.latex`, `.org`, `.rtf`, `.typ`, and other text-centric formats would go through the pandoc track. Requires adding Pandoc (Haskell binary) as a dependency in the conversion service.

<!-- END VERBATIM COPY -->

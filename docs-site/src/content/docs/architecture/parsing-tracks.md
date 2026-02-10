---
title: Parsing Tracks
description: How documents are parsed into blocks — mdast for Markdown, Docling for DOCX/PDF, Pandoc for everything else.
sidebar:
  order: 1
---

A **parsing track** is the pipeline that converts an uploaded document into typed, ordered blocks. Each track uses a different tool and produces a different representation type and locator format.

## Three tracks

| Track | Source Types | Tool | Representation | Locator Type | Status |
|-------|-------------|------|---------------|-------------|--------|
| **mdast** | `.md` | remark/mdast | `markdown_bytes` | `text_offset_range` | Live (inline) |
| **Docling** | `.docx`, `.pdf` | Docling | `doclingdocument_json` | `docling_json_pointer` | Live (Cloud Run) |
| **Pandoc** | `.txt`, `.epub`, `.odt`, `.rst`, `.latex`, `.html`, + 20 more | Pandoc | `pandoc_ast_json` | `pandoc_ast_path` | Spec only |

## mdast track

Markdown is parsed inline in the Edge Function using remark/mdast. No external service required.

**Pipeline:**
```
.md file → remark parse → mdast AST → extract blocks → blocks_v2
```

- Blocks get `text_offset_range` locators (byte offsets into the raw markdown)
- `List` nodes are not emitted as blocks — each `ListItem` is extracted individually
- `Table` is emitted as one block (rows are not separate)
- `Blockquote` currently maps to `other`

## Docling track

DOCX and PDF are sent to a Cloud Run conversion service running Docling. The service produces markdown (for display) plus a DoclingDocument JSON sidecar (for block extraction).

**Pipeline:**
```
.docx/.pdf → upload to Storage → ingest creates signed URLs
          → Cloud Run: Docling converts to .md + .docling.json
          → callback with docling_key
          → conversion-complete downloads .docling.json
          → extractDoclingBlocks() → blocks_v2
```

- Blocks get `docling_json_pointer` locators (JSON pointer + optional page number)
- Reading order follows the DoclingDocument `body` tree
- Deterministic JSON serialization: `sort_keys=True, separators=(",",":")`
- `conv_uid` is computed from the deterministic JSON bytes

### Shared utility

`supabase/functions/_shared/docling.ts` provides `extractDoclingBlocks()`:
- Parses DoclingDocument JSON
- Maps DocItemLabel values to the platform block type enum
- Returns typed blocks with `docling_json_pointer` locators

## Pandoc track (spec only)

Pandoc is a universal document converter supporting 30+ formats. Adding it would unlock:

**Pandoc-only formats (27):** ODT, EPUB, LaTeX, RST, Org-mode, Textile, MediaWiki, Djot, Typst, DocBook, OPML, Muse, RTF, FictionBook, Jupyter Notebook, Jira wiki, BibTeX, BibLaTeX, CSL JSON, EndNoteXML, RIS, TSV, man pages, and more.

**Implementation would require:**
- Adding the Pandoc binary (Haskell) to the conversion service Docker image
- Implementing pandoc track block extraction
- Mapping Pandoc AST nodes to the platform block type enum

## Format routing strategy

If Pandoc is added:

| Category | Formats | Track |
|----------|---------|-------|
| **Docling-only** | PDF, PPTX, XLSX, Image, Audio | Docling |
| **Pandoc-only** | ODT, EPUB, LaTeX, RST, Org, RTF, etc. | Pandoc |
| **Overlap** | DOCX, HTML | Docling (spatial data), Pandoc as fallback |
| **Markdown** | `.md` | mdast (inline, lightweight) |

## Capability comparison

| Feature | mdast | Docling | Pandoc |
|---------|:-----:|:-------:|:------:|
| Citations | No | No | Yes (`Cite` nodes) |
| Blockquotes | Yes (maps to `other`) | No | Yes (first-class) |
| Section nesting | No (flat) | Yes (heading-level groups) | With `--section-divs` flag |
| Page numbers | N/A | Yes | N/A |
| Bounding boxes | N/A | Yes | N/A |
| Table geometry | Basic | Rich | Basic |

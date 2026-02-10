---
title: Enum Registries
description: Canonical and proposed enum values for source types, conversion status, parsing tools, and representation types.
sidebar:
  order: 3
---

Status labels:
- **CANONICAL** — Defined by the v2.0 contract
- **PROPOSED** — Implied by examples, not yet ratified as strict

## `source_type` (PROPOSED)

The original uploaded source format.

| Value | Notes |
|-------|-------|
| `md` | Markdown — parsed via mdast |
| `txt` | Plain text — treated as markdown |
| `docx` | Word — parsed via Docling |
| `pdf` | PDF — parsed via Docling |
| `pptx` | PowerPoint — parsed via Docling |
| `html` | HTML — parsed via Docling |
| `image` | Image (OCR) — parsed via Docling |
| `asciidoc` | AsciiDoc |
| `csv` | CSV |
| `xlsx` | Excel |
| `xml_uspto` | USPTO XML |
| `xml_jats` | JATS XML |
| `mets_gbs` | METS/GBS |
| `json_docling` | Docling JSON |
| `audio` | Audio (transcription) |
| `vtt` | WebVTT |

## `conv_status` (PROPOSED)

Conversion/parsing outcome.

| Value | Description |
|-------|-------------|
| `success` | All blocks extracted |
| `partial_success` | Some blocks extracted, errors on others |
| `failure` | Conversion failed entirely |

## `conv_parsing_tool` (PROPOSED)

The tool used to derive the block inventory.

| Value | Status |
|-------|--------|
| `mdast` | Live (inline, no service) |
| `docling` | Live (Cloud Run conversion service) |
| `pandoc` | Spec only (not yet implemented) |

## `conv_representation_type` (CANONICAL)

The representation that was parsed to produce blocks.

| Value | Tool | Description |
|-------|------|-------------|
| `markdown_bytes` | mdast | UTF-8 markdown text |
| `doclingdocument_json` | Docling | DoclingDocument JSON (deterministic serialization) |
| `pandoc_ast_json` | Pandoc | Pandoc AST JSON (spec only) |

## `block_type` (CANONICAL)

See [Block Types](/docs/reference/block-types/) for the full mapping table.

17 values: `heading`, `paragraph`, `list_item`, `code_block`, `table`, `figure`, `caption`, `footnote`, `divider`, `html_block`, `definition`, `checkbox`, `form_region`, `key_value_region`, `page_header`, `page_footer`, `other`

## `block_locator.type` (CANONICAL)

| Value | Paired with |
|-------|-------------|
| `text_offset_range` | `markdown_bytes` |
| `docling_json_pointer` | `doclingdocument_json` |
| `pandoc_ast_path` | `pandoc_ast_json` |

---
title: Blocks
description: Blocks are the atomic semantic units that documents are decomposed into — paragraphs, headings, tables, and more.
sidebar:
  order: 3
---

A **block** is the atomic unit of BlockData. When a document is uploaded, the platform parses it into an ordered sequence of typed blocks. Every block has a stable identity, a normalized type, and a locator pointing back to its position in the original parsed representation.

## What makes a block

Each block carries five immutable fields:

| Field | Description |
|-------|-------------|
| `block_uid` | Unique identifier: `conv_uid + ":" + block_index` |
| `block_index` | 0-based position in reading order |
| `block_type` | Normalized type from the platform enum (see below) |
| `block_locator` | Typed provenance pointer back into the parsed representation |
| `block_content` | The original text content, preserved verbatim |

## Block types

The platform normalizes parser-specific node types into a unified enum:

| `block_type` | mdast node(s) | Docling label(s) |
|:---:|:---:|:---:|
| `heading` | Heading | TITLE, SECTION_HEADER |
| `paragraph` | Paragraph | PARAGRAPH, TEXT |
| `list_item` | ListItem | LIST_ITEM |
| `code_block` | Code | CODE |
| `table` | Table | TABLE, DOCUMENT_INDEX |
| `figure` | *(none)* | PICTURE |
| `caption` | *(none)* | CAPTION |
| `footnote` | FootnoteDefinition | FOOTNOTE |
| `divider` | ThematicBreak | *(none)* |
| `html_block` | Html | *(none)* |
| `definition` | Definition | *(none)* |
| `checkbox` | *(none)* | CHECKBOX_SELECTED, CHECKBOX_UNSELECTED |
| `form_region` | *(none)* | FORM |
| `key_value_region` | *(none)* | KEY_VALUE_REGION |
| `page_header` | *(none)* | PAGE_HEADER |
| `page_footer` | *(none)* | PAGE_FOOTER |
| `other` | *(catch-all)* | *(unmapped labels)* |

## Parsing tracks

The platform uses different parsers depending on the source format:

| Track | Source | Tool | Locator Type |
|-------|--------|------|-------------|
| **mdast** | `.md` files | remark/mdast | `text_offset_range` (byte offsets into raw markdown) |
| **Docling** | `.docx`, `.pdf` | Docling (Cloud Run) | `docling_json_pointer` (JSON pointer + page number) |
| **Pandoc** | `.txt`, `.epub`, `.odt`, etc. | Pandoc | `pandoc_ast_path` (spec only, not yet implemented) |

### Pairing rules

These are strict — invalid combinations are rejected:

- `mdast` → `markdown_bytes` → `text_offset_range`
- `docling` → `doclingdocument_json` → `docling_json_pointer`
- `pandoc` → `pandoc_ast_json` → `pandoc_ast_path`

## Block locator examples

**mdast track:**
```json
{ "type": "text_offset_range", "start_offset": 123, "end_offset": 456 }
```

**Docling track:**
```json
{ "type": "docling_json_pointer", "pointer": "#/texts/5", "page_no": 3 }
```

## Immutability

Block content is never modified after extraction. All AI-produced output (extractions, revisions, classifications) lives in the [overlay layer](/docs/concepts/overlays/), not in the block itself. This means:

- Multiple schemas can be applied to the same blocks without interference
- The original source text is always available for reference
- Block identity (`block_uid`) is stable across runs

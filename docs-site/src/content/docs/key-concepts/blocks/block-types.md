---
title: Block Types
description: The normalized block type enum and its mapping to parser-specific node types.

sidebar:
  order: 1
---

**Spec version:** v1.0
**Date:** 2026-02-11
**Source:** `docs/product-defining-v2.0/0207-blocks.md`, `docs/specs/block-types-and-parsing-tracks.md`
**Status:** Canonical — implemented for mdast and docling tracks

---

## Scope

This page defines the `platform_block_type` enum and its mapping from parser-specific node types. It covers mdast, Docling, and Pandoc mappings.

It does **not** cover: block extraction logic, locator schemas, or field definitions (see [Immutable Fields](/docs/key-concepts/schemas/immutable-schema/)).

---

<!-- BEGIN VERBATIM COPY from docs/specs/block-types-and-parsing-tracks.md (enum + mapping sections) and docs/product-defining-v2.0/0207-blocks.md -->

## Platform Block Type Enum

The `platform_block_type` is a normalized enum that unifies block types across all parsing tracks.

| platform_block_type | mdast node(s) | docling label(s) | pandoc node(s) |
|---|---|---|---|
| `heading` | `Heading` | `TITLE`, `SECTION_HEADER` | `Header` |
| `paragraph` | `Paragraph` | `PARAGRAPH`, `TEXT` | `Para` |
| `list_item` | `ListItem` | `LIST_ITEM` | *(children of `BulletList`/`OrderedList`)* |
| `code_block` | `Code` | `CODE` | `CodeBlock` |
| `table` | `Table` | `TABLE`, `DOCUMENT_INDEX` | `Table` |
| `figure` | *(none)* | `PICTURE` | `Figure` |
| `caption` | *(none)* | `CAPTION` | *(none)* |
| `footnote` | `FootnoteDefinition` | `FOOTNOTE` | `Note` |
| `divider` | `ThematicBreak` | *(none)* | `HorizontalRule` |
| `html_block` | `Html` | *(none)* | `RawBlock` |
| `definition` | `Definition` | *(none)* | `DefinitionList` |
| `checkbox` | *(none)* | `CHECKBOX_SELECTED`, `CHECKBOX_UNSELECTED` | *(none)* |
| `form_region` | *(none)* | `FORM` | *(none)* |
| `key_value_region` | *(none)* | `KEY_VALUE_REGION` | *(none)* |
| `page_header` | *(none)* | `PAGE_HEADER` | *(none)* |
| `page_footer` | *(none)* | `PAGE_FOOTER` | *(none)* |
| `other` | *(catch-all fallback)* | *(unmapped labels)* | *(unmapped nodes)* |

## Native Node Types

These are the raw node types from each parser, before normalization to `platform_block_type`.

### mdast

Uses remark + remark-gfm.

Block-level: `Heading`, `Paragraph`, `Blockquote`, `List`, `ListItem`, `Code`, `ThematicBreak`, `Definition`, `Html`, `Table`, `TableRow`, `TableCell`, `Delete`, `FootnoteDefinition`, `FootnoteReference`

Notes:
- `List` is not emitted as a block; we walk into it and emit each `ListItem` individually.
- `TableRow` / `TableCell` are sub-table; the whole `Table` is emitted as one block.
- `Blockquote` has no mapping in the current enum.

### Docling

Source model: DoclingDocument.

**DocItemLabel:** `TITLE`, `SECTION_HEADER`, `PARAGRAPH`, `TEXT`, `LIST_ITEM`, `CODE`, `TABLE`, `DOCUMENT_INDEX`, `PICTURE`, `FORMULA`, `CAPTION`, `FOOTNOTE`, `PAGE_HEADER`, `PAGE_FOOTER`, `CHECKBOX_SELECTED`, `CHECKBOX_UNSELECTED`, `FORM`, `KEY_VALUE_REGION`

**GroupLabel:** `CHAPTER`, `SECTION`, `LIST`, `INLINE`, `PICTURE_AREA`, `COMMENT_SECTION`, `FORM_AREA`, `KEY_VALUE_AREA`, `UNSPECIFIED`

**ContentLayer:** `BODY`, `FURNITURE`, `NOTES`, `INVISIBLE`

Notes:
- Docling provides layout-level categories (page headers/footers, formulas, checkboxes, key-value regions) that mdast has no concept of.
- `FORMULA`, `PAGE_HEADER`, `PAGE_FOOTER`, `CHECKBOX_*`, `FORM`, `KEY_VALUE_REGION` currently map to `other` in our enum.

### Pandoc AST

Block-level: `Header`, `Para`, `CodeBlock`, `BlockQuote`, `BulletList`, `OrderedList`, `DefinitionList`, `Table`, `Figure`, `Div`, `LineBlock`, `RawBlock`, `HorizontalRule`, `Null`

Inline-level: `Str`, `Emph`, `Strong`, `Link`, `Image`, `Code`, `Math`, `Cite`, `Note`, `Span`, `RawInline`

Notes:
- Pandoc has `BlockQuote` as a first-class block type (could warrant adding `blockquote` to the platform enum).
- `DefinitionList` is richer than mdast's `Definition`.
- `Figure` is a block-level node (unlike mdast where `Image` is inline).

<!-- END VERBATIM COPY -->

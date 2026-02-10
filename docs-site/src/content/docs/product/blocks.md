---
title: Blocks
description: Block type definitions, mapping table across parsing tracks, and hybrid extraction strategy.
sidebar:
  order: 3
---

Definition: the atomic unit used in this platform. Conversion into blocks starts after user creates new project, uploads documents, and documents are analyzed/processed within the project list page. Each processed document will be analyzed and automatically divided up into 'blocks' according to the node/atomic units for non-md (DoclingDocument) and md (mdast).

The available atomic units (equivalent to node or block) for DoclingDocument and mdast are as shown in the table below.

| doclingdocument | DocItemLabel: TITLE, SECTION_HEADER, PARAGRAPH, TEXT, LIST_ITEM, CODE, TABLE, DOCUMENT_INDEX, PICTURE, FORMULA, CAPTION, FOOTNOTE, PAGE_HEADER, PAGE_FOOTER, CHECKBOX_SELECTED, CHECKBOX_UNSELECTED, FORM, KEY_VALUE_REGION GroupLabel: CHAPTER, SECTION, LIST, INLINE, PICTURE_AREA, COMMENT_SECTION, FORM_AREA, KEY_VALUE_AREA, UNSPECIFIED ContentLayer: BODY, FURNITURE, NOTES, INVISIBLE |
| :---- | :---- |
| mdast | Heading, Paragraph, Blockquote, List, ListItem, Code, ThematicBreak, Definition, Html  Table, TableRow, TableCell, Delete, FootnoteDefinition, FootnoteReference |

## Platform Block Type Mapping

| platform_block_type | mdast node(s) | docling label(s) |
| :---: | :---: | :---: |
| heading | Heading | TITLE, SECTION_HEADER |
| paragraph | Paragraph | PARAGRAPH, TEXT |
| list_item | ListItem | LIST_ITEM |
| code_block | Code | CODE |
| table | Table | TABLE, DOCUMENT_INDEX |
| figure | *(no core mdast equivalent; often Image is inline)* | PICTURE |
| caption | *(no core mdast equivalent)* | CAPTION |
| footnote | FootnoteDefinition (GFM) | FOOTNOTE |
| divider | ThematicBreak | *(no docling label in your current set)* |
| html_block | Html | *(no docling label in your current set)* |
| definition | Definition | *(no docling label in your current set)* |
| checkbox | *(no core mdast equivalent)* | CHECKBOX_SELECTED, CHECKBOX_UNSELECTED |
| form_region | *(no core mdast equivalent)* | FORM |
| key_value_region | *(no core mdast equivalent)* | KEY_VALUE_REGION |
| page_header | *(not a markdown AST concept)* | PAGE_HEADER |
| page_footer | *(not a markdown AST concept)* | PAGE_FOOTER |
| other | *(anything not mapped)* | *(anything not mapped)* |

## Hybrid Block Extraction

Use Docling for non-Markdown formats to achieve the following pipeline:

| upload any of these document types | DOCX, PPTX, PDF, HTML, IMAGE, ASCIIDOC, CSV, XLSX, XML_USPTO, XML_JATS, METS_GBS, JSON_DOCLING, AUDIO, VTT |
| :---- | :---- |
| Docling Conversion | TITLE DOCUMENT_INDEX SECTION_HEADER PARAGRAPH TEXT LIST_ITEM CODE TABLE PICTURE FORMULA CAPTION FOOTNOTE PAGE_HEADER PAGE_FOOTER CHECKBOX_SELECTED CHECKBOX_UNSELECTED |
| [DoclingDocument] |  |
| Define into our "blocks" |  |

The requirement is hybrid block extraction: use an AST-like structured representation that yields typed, ordered, end-to-end blocks.

- **Non-MD** (docx/pptx/pdf/html/image/xlsx/...): Docling conversion → DoclingDocument → block extraction
- **MD**: remark parse → mdast → block extraction

Rationale: MD already has a first-class AST (mdast) with precise source positions. DoclingDocument is richer for converted formats (tables/pictures/headers/footnotes/layout/furniture) than what you'll get by forcing everything into Markdown then mdast.

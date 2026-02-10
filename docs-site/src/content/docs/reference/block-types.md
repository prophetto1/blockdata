---
title: Block Types
description: The full platform block type enum with mappings to mdast, Docling, and Pandoc parser-specific types.
sidebar:
  order: 1
---

## Platform block type enum

The `block_type` field uses this canonical enum. All parser-specific node types are normalized into these values.

| `block_type` | mdast node(s) | Docling label(s) | Pandoc node(s) |
|:---:|:---:|:---:|:---:|
| `heading` | Heading | TITLE, SECTION_HEADER | Header |
| `paragraph` | Paragraph | PARAGRAPH, TEXT | Para |
| `list_item` | ListItem | LIST_ITEM | *(children of BulletList/OrderedList)* |
| `code_block` | Code | CODE | CodeBlock |
| `table` | Table | TABLE, DOCUMENT_INDEX | Table |
| `figure` | *(none)* | PICTURE | Figure |
| `caption` | *(none)* | CAPTION | *(none)* |
| `footnote` | FootnoteDefinition | FOOTNOTE | Note |
| `divider` | ThematicBreak | *(none)* | HorizontalRule |
| `html_block` | Html | *(none)* | RawBlock |
| `definition` | Definition | *(none)* | DefinitionList |
| `checkbox` | *(none)* | CHECKBOX_SELECTED, CHECKBOX_UNSELECTED | *(none)* |
| `form_region` | *(none)* | FORM | *(none)* |
| `key_value_region` | *(none)* | KEY_VALUE_REGION | *(none)* |
| `page_header` | *(none)* | PAGE_HEADER | *(none)* |
| `page_footer` | *(none)* | PAGE_FOOTER | *(none)* |
| `other` | *(catch-all)* | *(unmapped labels)* | *(unmapped nodes)* |

## Upstream label inventories

### mdast (remark + remark-gfm)

`Heading`, `Paragraph`, `Blockquote`, `List`, `ListItem`, `Code`, `ThematicBreak`, `Definition`, `Html`, `Table`, `TableRow`, `TableCell`, `Delete`, `FootnoteDefinition`, `FootnoteReference`

Notes:
- `List` is not emitted as a block — each `ListItem` is extracted individually
- `Table` is emitted as one block (rows are not separate blocks)
- `Blockquote` currently maps to `other`

### Docling (DocItemLabel)

`TITLE`, `SECTION_HEADER`, `PARAGRAPH`, `TEXT`, `LIST_ITEM`, `CODE`, `TABLE`, `DOCUMENT_INDEX`, `PICTURE`, `FORMULA`, `CAPTION`, `FOOTNOTE`, `PAGE_HEADER`, `PAGE_FOOTER`, `CHECKBOX_SELECTED`, `CHECKBOX_UNSELECTED`, `FORM`, `KEY_VALUE_REGION`

**GroupLabel:** `CHAPTER`, `SECTION`, `LIST`, `INLINE`, `PICTURE_AREA`, `COMMENT_SECTION`, `FORM_AREA`, `KEY_VALUE_AREA`, `UNSPECIFIED`

**ContentLayer:** `BODY`, `FURNITURE`, `NOTES`, `INVISIBLE`

Notes:
- `FORMULA`, `PAGE_HEADER`, `PAGE_FOOTER`, checkbox types, `FORM`, `KEY_VALUE_REGION` map to their respective platform types
- Unmapped labels fall to `other`

### Pandoc

`Header`, `Para`, `CodeBlock`, `BlockQuote`, `BulletList`, `OrderedList`, `DefinitionList`, `Table`, `Figure`, `Div`, `LineBlock`, `RawBlock`, `HorizontalRule`, `Null`

Notes:
- Pandoc track is spec only (not yet implemented)
- `BlockQuote` is first-class in Pandoc (could be added to platform enum)
- `Figure` is block-level in Pandoc

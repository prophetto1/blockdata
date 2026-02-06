# Immutable Document Schema (Verified)

This document defines the final JSON structure for the **Post-Conversion Artifact**. It consolidates the findings from the Docling metadata verification and the Immutable Identity requirements.

## 1. The Immutable Envelope
This is the root object created immediately after Docling processing.

```json
{
  "immutable": {
    "system_identity": {
      "doc_uid": "Computed: SHA256( chunking_strategy + '\n' + md_uid )",
      "source_uid": "Computed: SHA256( docling.input.format + '\n' + docling.input.document_hash )",
      "md_uid": "Computed: SHA256( raw_markdown_string )"
    },
    "system_config": {
      "chunking_strategy": "leaf", 
      "chunking_granularity": 1
    },
    "system_storage": {
      "md_locator": "s3://bucket/path/to/content.md"
    },
    "docling": {
      "input": {
        "file": "MyPaper.pdf",
        "format": "pdf",
        "document_hash": "a1b2c3d4...",
        "filesize": 1048576,
        "page_count": 12
      },
      "conversion": {
        "status": "success",
        "timestamp": "2023-10-27T10:00:00",
        "version": {
           "docling_version": "2.0.0",
           "docling_core_version": "1.0.0"
        },
        "timings": {
           "pipeline_setup": { "duration": 0.5 },
           "doc_analysis": { "duration": 2.1 }
        },
        "pages": [
           { 
             "page_no": 1, 
             "size": { "width": 600, "height": 800 }, 
             "predictions": [ { "label": "table", "bbox": [...] } ]
           }
        ],
        "origin": {
           "filename": "MyPaper.pdf",
           "mimetype": "application/pdf",
           "binary_hash": "a1b2c3d4..."
        }
      }
    },
    "blocks": [
      {
        "node_uid": "Computed: SHA256( doc_uid + ':' + node_index )",
        "node_type": "paragraph",   // Derived from MDAST node.type
        "node_index": 0,            // Derived from Traversal Order
        "section_path": "/Root/Introduction", // Derived from Heading Stack
        "char_span": {              // Derived from node.position
          "start": { "line": 1, "column": 1, "offset": 0 },
          "end": { "line": 1, "column": 50, "offset": 50 }
        },
        "original_content": "This is the first paragraph of the text."
      },
      {
        "node_uid": "...",
        "node_type": "heading",
        "node_index": 1,
        "section_path": "/Root/Section1",
        "char_span": { ... },
        "original_content": "Section 1"
      }
    ]
  },
  "user_defined": {}
}
```

## 2. Key Decisions & Rationale

1.  **Flattened Docling Output:** The `docling.conversion` object mirrors the flattened `ConversionResult` structure (where `status`, `pages`, and `origin` are peers), avoiding unnecessary nesting.
2.  **Explicit System Config:** `system_config` is added to the immutable core because user choices at upload time (like `chunking_strategy`) fundamentally alter the `doc_uid` and the resulting Node Units.
3.  **MD-First Architecture:** The existence of `md_uid` and the use of MDAST for block derivation confirms that Markdown is the canonical intermediate representation.
4.  **Paragraph as Minimum Unit:** We treat the MDAST `paragraph` node as the atomic unit. Sentence splitting, if needed, is a view-layer operation, not a structural node type.
5.  **Page Mapping:** The `pages` array is preserved in the envelope to strictly bind the extracted text back to the visual coordinates of the source PDF ("View Source" capability).

## 4. Chunking Strategies (Enum Values)
The `system_config.chunking_strategy` behavior depends on whether the input is **Fixed Layout** (PDF, Images) or **Flow Layout** (Markdown, DOCX, HTML).

### A. Universal Strategies
*Supported by ALL formats.*

| Enum Value | Description | Granularity | 
| :--- | :--- | :--- |
| **`leaf`** | **Atomic.** Maps 1:1 to MDAST nodes. Includes Core nodes (`Blockquote`, `Break`, `Code`, `Definition`, `Emphasis`, `Heading`, `Html`, `Image`, `ImageReference`, `InlineCode`, `Link`, `LinkReference`, `List`, `ListItem`, `Paragraph`, `Root`, `Strong`, `Text`, `ThematicBreak`) and GFM/Frontmatter extensions (`Delete`, `FootnoteDefinition`, `FootnoteReference`, `Table`, `TableRow`, `TableCell`, `Yaml`). **This is the recommended default for consistency.** | High |

### B. Fixed-Layout Strategies
*Only for: PDF, PPTX, Images.*

| Enum Value | Description | Granularity | 
| :--- | :--- | :--- |
| **`page`** | **Physical Page.** Groups all content strictly by source page number (Page 1, Page 2). **Primary strategy for PDF.** | Variable |
| `section` | *Not Supported* (Requires unreliable AI layout analysis). | N/A |

### C. Flow-Layout Strategies
*Only for: Markdown, DOCX, HTML, TXT.*

| Enum Value | Description | Granularity | 
| :--- | :--- | :--- |
| **`section`** | **Logical Section.** Groups content by Heading hierarchy (H1, H2). **Primary strategy for Docs.** | Variable |
| `page` | *Not Supported* (Treats entire document as 1 block/page). | N/A |

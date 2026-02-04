1. The Immutable  - Docling Layer
{
  "immutable": {
    "system_identity": {
      "doc_uid": "SHA256(config + md_uid)",
      "source_uid": "SHA256(format + file_hash)",
      "md_uid": "SHA256(markdown_content)"
    },
    "system_config": {
      "chunking_strategy": "paragraph",
      "chunking_granularity": 1
    },
    "system_storage": {
      "md_locator": "s3://path/to/file.md"
    },
    "docling": {
      "input": {
        "file": "MyPaper.pdf",
        "format": "pdf",
        "document_hash": "a1b2...",
        "filesize": 1024,
        "page_count": 12
      },
      "conversion": {
        "status": "success",
        "timestamp": "2023-10-27T...",
        "timings": { ... },
        "origin": {
          "filename": "MyPaper.pdf",
          "mimetype": "application/pdf",
          "binary_hash": "a1b2..."
        },
        "pages": [
          { "page_no": 1, "size": { "width": 600, "height": 800 }, "predictions": [...] }
        ]
      }
    }
  },
  "user_defined": {}
}

{
  "node_uid": "SHA256(doc_uid + index)",
  "node_type": ",
  "node_index": 0,
  "section_path": "/Heading/SubHeading",
  "char_span": {
    "start": { "line": 1, "column": 1, "offset": 0 },
    "end": { "line": 5, "column": 20, "offset": 500 }
  },
  "original_content": "The actual text of the paragraph."
}


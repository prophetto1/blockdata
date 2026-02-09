```json
{
  "immutable": {
    "envelope": {
      "doc_uid": "Computed: SHA256(immutable_schema_ref + '\\n' + md_uid) -- Depends on output content, NOT direct Docling metadata",
      "source_uid": "Computed: SHA256(source_type + '\\n' + input_document.document_hash)",
      "md_uid": "Computed: SHA256(output_markdown_bytes) -- derived from Docling conversion output",
      "source_type": "Mapped from input_document.format (e.g., 'pdf', 'docx')",
      "source_locator": "input_document.file",
      "md_locator": "System dependent (where the output markdown is stored)",
      "doc_title": "input_document.file (stem) OR document_origin.filename",
      "uploaded_at": "conversion_assets.timestamp",

      "block_uid": "block related metadata is defined after conversion into mdast; SHA256 (doc_uid+':'+block_index)",
      "block_type": "Derived from mdast node type (paragraph, heading)",
      "block_index": "Derived from mdast traversal order",
      "section_path": "Derived from mdast heading hierarchy",
      "char_span": "Derived from mdast position" 
    },
    "content": { "original": "…" }
  },
  "annotation": {
    "schema_ref": null,
    "schema_uid": null,
    "data": {}
  }
}
```

## Field Reference (In JSON Order)

| L1         | L2       | Field                | Meaning                                                                                             |
| ---------- | -------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| immutable  |          | immutable_schema_ref | Which immutable record-kind is being used for this ingest (e.g., prose vs law-case vs KB metadata). |
| immutable  | envelope | doc_uid              | Document identifier. SHA256(immutable_schema_ref + "\n" + md_uid). Blocks FK to this.               |
| immutable  | envelope | source_uid           | Identity of the uploaded source blob. SHA256(source_type + "\n" + raw_source_bytes).                |
| immutable  | envelope | md_uid               | Identity of the Markdown bytes used for ingest. SHA256(raw_markdown_bytes).                         |
| immutable  | envelope | source_type          | Original upload format (md, docx, pdf, txt).                                                        |
| immutable  | envelope | source_locator       | Storage path for the original uploaded file.                                                        |
| immutable  | envelope | md_locator           | Storage path for the Markdown used for ingest. Same as source_locator for .md uploads.              |
| immutable  | envelope | doc_title            | Auto-extracted from first H1 heading, user-editable.                                                |
| immutable  | envelope | uploaded_at          | Upload timestamp.                                                                                   |
| immutable  | envelope | block_uid            | Block identifier within the document. SHA256(doc_uid + ":" + block_index).                          |
| immutable  | envelope | block_type           | Block kind (paragraph/heading/etc.).                                                                |
| immutable  | envelope | block_index          | Block position in reading order.                                                                    |
| immutable  | envelope | section_path         | Heading stack location of the block.                                                                |
| immutable  | envelope | char_span            | Character offsets into the stored Markdown string (md_locator target).                              |
| immutable  | content  | original             | The extracted block text (the paragraph itself lives here).                                         |
| annotation |          | schema_ref           | Reserved for Phase 2. In Phase 1, this is NULL (or empty string) and is not used.                   |
| annotation |          | schema_uid           | Reserved for Phase 2. In Phase 1, this is NULL. In Phase 2, SHA256 of canonicalized schema JSON.    |
| annotation |          | data                 | Reserved for Phase 2. In Phase 1, this is always {}.                                                |

## Identity Model (Three Hashes)

Three content-addressed hashes identify different things:

**source_uid** = SHA256(source_type + "\n" + raw_source_bytes). Identity of the uploaded source blob (docx, pdf, md, etc.). Always computable at upload time. Used for: conversion job tracking, callbacks, storage paths, lifecycle status.

**md_uid** = SHA256(raw_markdown_bytes). Identity of the Markdown bytes that will be ingested. For .md uploads, raw_markdown_bytes = raw_source_bytes (so md_uid is computable immediately). For non-MD uploads, md_uid is computed after conversion completes. Used for: deduplication across formats (a converted .docx and a directly-uploaded .md that produce identical Markdown yield the same md_uid).

**doc_uid** = SHA256(immutable_schema_ref + "\n" + md_uid). Identity of a document under an immutable schema. Same Markdown under different immutable_schema_ref = different doc_uid. This is the FK target for blocks. Used for: block identity, all downstream operations. For .md uploads, doc_uid is computable immediately. For non-MD uploads, doc_uid is computed after conversion (because md_uid is needed first).

**block_uid** = SHA256(doc_uid + ":" + block_index). Deterministic, idempotent. Same document re-ingested under the same schema produces the same block UIDs.
# BlockData -> Zvec Integration Contract (Prescriptive)

Spec version: v0.1  
Date: 2026-02-12  
Status: Prescriptive (target contract, pre-implementation)

---

## 1) Scope

This document defines the target contract for making BlockData outputs ingestible into Zvec.

It standardizes:
- the canonical intermediate record for vectorization,
- mapping into Zvec `Doc` + `CollectionSchema`,
- ingestion idempotency, update behavior, and query filtering metadata.

It does not define:
- the worker execution plan,
- UI behavior,
- vendor-specific embedding model policy.

---

## 2) Core Integration Rule

BlockData remains the system of record for immutable substrate + overlays.  
Zvec is a derived retrieval index built from export outputs.

Default source for production indexing:
- Phase 2 export by `run_id` from `export-jsonl` using confirmed overlays by default.

Canonical source shape:
- Two-key export contract (`immutable`, `user_defined`) as defined in BlockData canonical docs.

---

## 3) Canonical Vectorization Record (`vector_record_v1`)

All input formats must be translated into this record before embedding/upsert.

```json
{
  "record_id": "run_id:block_uid",
  "source": {
    "run_id": "uuid",
    "conv_uid": "string",
    "block_uid": "string",
    "block_index": 37
  },
  "schema": {
    "schema_ref": "string|null",
    "schema_uid": "string|null"
  },
  "content": {
    "text_for_embedding": "string",
    "raw_block_content": "string",
    "user_defined_json": {}
  },
  "metadata": {
    "source_type": "md|txt|docx|pdf|pptx|xlsx|html|csv|...",
    "block_type": "paragraph|heading|list_item|table|...",
    "overlay_state": "confirmed|staging",
    "exported_at": "iso8601 timestamp"
  }
}
```

### Required invariants

1. `record_id` is stable for the same `(run_id, block_uid)`.
2. `text_for_embedding` is deterministic from the selected source policy.
3. `metadata` is filter-safe (flat scalar values where possible).
4. `overlay_state` is explicit (`confirmed` by default).

---

## 4) Text Selection Policy (`text_for_embedding`)

For each exported block:

1. If `user_defined.data` contains an approved edited text field for retrieval, use it.
2. Else use `immutable.block.block_content`.
3. Apply deterministic normalization:
   - trim leading/trailing whitespace,
   - collapse repeated spaces,
   - preserve sentence order,
   - preserve enough punctuation for semantics.

This keeps retrieval quality stable and reproducible.

---

## 5) Zvec Schema Contract

Target collection schema pattern:

- Primary ID:
  - `id` (string): `record_id`
- Scalar fields (filterable metadata):
  - `run_id` (string)
  - `conv_uid` (string)
  - `block_uid` (string)
  - `block_index` (int64)
  - `schema_ref` (string, nullable)
  - `schema_uid` (string, nullable)
  - `source_type` (string)
  - `block_type` (string)
  - `overlay_state` (string)
  - `exported_at` (string or timestamp-formatted string)
- Vector field:
  - `embedding` (`VECTOR_FP32`, fixed dimension)

Optional payload fields:
- `text_for_embedding` (string) for debugging/highlight reconstruction.
- serialized `user_defined_json` if needed for downstream post-filtering.

---

## 6) Zvec Write Contract

### Write mode

- Use `upsert` semantics keyed by `record_id`.
- Re-indexing the same export should be idempotent.

### Versioning rule

- If embedding model or dimension changes, write to a new collection namespace (or versioned path) instead of mutating incompatible vectors in place.

### Failure handling

- Fail per record, log error payload with `record_id`.
- Continue batch unless failure rate crosses configured threshold.

---

## 7) Query Contract

Minimum supported query capabilities:

1. Vector similarity on `embedding`.
2. Metadata filter with simple expressions (for example by `run_id`, `schema_ref`, `source_type`, `block_type`).
3. Return `id`, `score`, and selected output fields required for result reconstruction.

Result-to-BlockData join key:
- `id` (`record_id`) must map back to `(run_id, block_uid)`.

---

## 8) Mapping From Canonical Export

Given one BlockData export line:

```json
{
  "immutable": { "conversion": { "conv_uid": "c1" }, "block": { "block_uid": "b7", "block_index": 7, "block_type": "paragraph", "block_content": "..." }, "source_upload": { "source_type": "pdf" } },
  "user_defined": { "schema_ref": "legal_v1", "schema_uid": "sha256:abc", "data": { "summary": "..." } }
}
```

And export context:
- `run_id = r1`
- `overlay_state = confirmed`

Produced `vector_record_v1`:
- `record_id = "r1:b7"`
- `source.run_id = "r1"`
- `source.conv_uid = "c1"`
- `source.block_uid = "b7"`
- `source.block_index = 7`
- `content.raw_block_content = immutable.block.block_content`
- `content.user_defined_json = user_defined.data`
- `content.text_for_embedding = policy result`
- `metadata.source_type = immutable.source_upload.source_type`
- `metadata.block_type = immutable.block.block_type`
- `metadata.overlay_state = "confirmed"`

---

## 9) Acceptance Checklist

The integration is considered contract-compliant when all are true:

1. JSONL export lines map to valid `vector_record_v1` without missing required fields.
2. Upsert is idempotent for reruns with unchanged source.
3. Query returns stable join keys back to BlockData records.
4. Metadata filters work for at least `run_id`, `schema_ref`, and `block_type`.
5. Reindex path exists for embedding dimension/model changes.

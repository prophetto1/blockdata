# Non-MD Docling Track Implementation Plan (v2)

Date: 2026-02-08

## Purpose

Implement the **non-MD Docling track** so that non-Markdown uploads produce v2 blocks from **DoclingDocument JSON** (not Markdown→mdast), consistent with:

- `docs/product-defining-v2.0/0207-blocks.md` (non-MD: Docling conversion → DoclingDocument → block extraction)
- `docs/product-defining-v2.0/0207-immutable-fields.md` (`conv_uid` hashing rule + pairing rule)
- `docs/product-defining-v2.0/0207-prd-tech-spec-doc2.md` (pairing rules, locator types, canonical export contract)

## Spec Requirements (must-haves)

For non-MD uploads (e.g., `.docx`, `.pdf`):

1. `documents_v2.conv_parsing_tool = 'docling'`
2. `documents_v2.conv_representation_type = 'doclingdocument_json'`
3. `documents_v2.conv_uid = sha256("docling\n" + "doclingdocument_json\n" + conv_representation_bytes)`
4. `blocks_v2.block_locator.type = 'docling_json_pointer'`
5. Export JSONL for each block conforms to the v2 canonical `{ immutable, user_defined }` record shape.

## Current State (why this work is needed)

- Non-MD ingestion uses: conversion-service → uploads Markdown → `conversion-complete` parses Markdown via mdast.
- This results in: `conv_parsing_tool='mdast'`, `conv_representation_type='markdown_bytes'`, and `block_locator.type='text_offset_range'`.
- `supabase/functions/ingest/index.ts` already supports an optional `docling_output` signed upload target, but it is currently a debug artifact and not part of the ingestion contract.

## Design Principle

Docling track must be **first-class and deterministic**:

- The bytes used to compute `conv_uid` MUST be deterministically serialized DoclingDocument JSON bytes.
- The provenance pointer stored in `block_locator` MUST point back into that DoclingDocument JSON in a stable way (`docling_json_pointer`).

## Implementation Overview (high-level)

1. Always produce a DoclingDocument JSON artifact for Docling-handled non-MD conversions.
2. Pass the docling JSON storage key through the callback contract.
3. In `conversion-complete`, if docling JSON is present, compute `conv_uid` from docling JSON bytes and extract blocks from docling JSON into `blocks_v2` with `docling_json_pointer` locators.
4. Keep the current Markdown→mdast path as a temporary fallback for backward compatibility (only when docling JSON is absent).
5. Update smoke tests to validate the real docling track using a `.docx` or `.pdf` fixture by default.

## Detailed Step-by-Step Plan

### Step 1 — Make Docling JSON output non-optional for non-MD ingest

**Goal:** ensure every non-MD conversion request includes `docling_output` (not only when debug is enabled).

- Update `supabase/functions/ingest/index.ts`:
  - For docling-handled source types (at least `docx` and `pdf`), always request a signed upload URL for `converted/{source_uid}/{basename}.docling.json`.
  - Include `docling_output` in the `/convert` request payload unconditionally for those types.
  - Keep the existing Markdown output target (`md_key`) as-is for now.

**Notes / constraints:**
- `services/conversion-service/app/main.py` currently only accepts `docx|pdf|txt`. If `.pptx` is desired, add support there first (or prevent `.pptx` from reaching conversion-service until supported).

### Step 2 — Canonicalize Docling JSON serialization (hash-safe)

**Goal:** produce deterministic bytes for `conv_representation_bytes`.

- Update `services/conversion-service/app/main.py` to serialize docling JSON with a deterministic JSON dump:
  - `ensure_ascii=False`
  - `sort_keys=True`
  - stable separators (e.g., `separators=(",", ":")`)
  - UTF-8 encoding
- These bytes are:
  - uploaded to Storage as `{basename}.docling.json`
  - the authoritative `conv_representation_bytes` used for `conv_uid` hashing.

### Step 3 — Extend callback contract to include `docling_key`

**Goal:** `conversion-complete` must know where the docling JSON artifact is.

- Update conversion-service callback payload (POST to `conversion-complete`) to include:
  - `docling_key` when `docling_output` was provided and upload succeeded.
- Update `services/conversion-service/README.md` accordingly.

### Step 4 — Implement Docling-track branch in `conversion-complete`

**Goal:** if `docling_key` is present, use DoclingDocument JSON as the conversion substrate.

- Update `supabase/functions/conversion-complete/index.ts`:
  - Extend `ConversionCompleteBody` with `docling_key?: string | null`.
  - On success:
    - Download docling JSON bytes from Storage (via `docling_key`).
    - Compute `conv_uid = sha256("docling\ndoclingdocument_json\n" + docling_json_bytes)`.
    - Update `documents_v2`:
      - `conv_uid`, `conv_locator = docling_key`, `conv_status='success'`
      - `conv_parsing_tool='docling'`, `conv_representation_type='doclingdocument_json'`
      - `conv_total_blocks`, `conv_block_type_freq`, `conv_total_characters`
    - Extract blocks from docling JSON into `blocks_v2`:
      - `block_uid = conv_uid + ":" + block_index`
      - `block_type` mapped into the platform enum
      - `block_content` from the Docling item’s text (or an appropriate string representation for non-text items)
      - `block_locator = { type: "docling_json_pointer", pointer: <pointer>, page_no?: <page> }`
  - Keep current Markdown→mdast flow as fallback when `docling_key` is missing.

### Step 5 — Add `_shared/docling.ts` block extraction utility

**Goal:** keep Docling JSON parsing + mapping logic centralized and testable.

Create `supabase/functions/_shared/docling.ts`:

- Input: `docling_json_bytes` (UTF-8 JSON)
- Output: `{ blocks: BlockDraft[]; docTitle?: string | null; ... }`
- Responsibilities:
  1. Parse JSON.
  2. Identify a stable iteration order (reading order) to define `block_index`.
  3. Map Docling item types to platform `block_type` enum (see `docs/product-defining-v2.0/0207-blocks.md`).
  4. Produce stable pointers:
     - Pointer strategy must match the JSON actually produced by Docling’s `export_to_dict`.
     - Use JSON Pointer form consistent with the spec example (e.g., `#/texts/5`).
     - Include `page_no` if the exported structure provides it reliably.

**Critical dependency:** we need at least one real `.docling.json` artifact (from Storage) to finalize:

- the exact JSON structure
- the pointer path scheme
- the type mapping details

### Step 6 — Update smoke test to validate real Docling track

**Goal:** tests prove spec compliance.

Update `scripts/smoke-test-non-md.ps1`:

- Default `FilePath` should be a small `.docx` or `.pdf` fixture (not `.txt`).
- Add hard assertions (not warnings) that:
  - `immutable.conversion.conv_parsing_tool == 'docling'`
  - `immutable.conversion.conv_representation_type == 'doclingdocument_json'`
  - `immutable.block.block_locator.type == 'docling_json_pointer'`

### Step 7 — Acceptance Criteria (Definition of Done)

- [x] Non-MD ingest produces `documents_v2` rows with docling pairing fields set correctly.
- [x] Export JSONL for non-MD includes `block_locator.type='docling_json_pointer'`.
- [x] `conv_uid` is stable across repeated uploads of the same non-MD bytes (given the same Docling version and deterministic JSON serialization).
- [x] `scripts/smoke-test-non-md.ps1` passes on default settings (docx/pdf), without "mdast fallback" warnings.

> **Status (2026-02-08):** All steps implemented and deployed. Edge functions `ingest` (v10) and `conversion-complete` (v5) are live with full Docling track support. Conversion service serializes deterministically. Smoke test has hard assertions. Needs end-to-end validation run with `lorem_ipsum.docx` fixture to close out.

## Rollout / Compatibility

- Keep mdast fallback temporarily for:
  - existing conversions that only uploaded Markdown
  - transient conversion-service versions during rollout
- After stabilization, remove or disable the fallback so non-MD always uses the docling track.

## Known Risks / Decisions

1. **Docling JSON structure & pointer stability**
   - Must validate against real `export_to_dict()` output.
   - Pointer scheme must remain stable if Docling changes its JSON structure; pinning Docling version may be required.
2. **Non-text blocks**
   - Tables/figures/forms need a defined `block_content` strategy (e.g., text extraction, markdown export, or a normalized string).
3. **Multi-tenancy constraint**
   - `documents_v2.source_uid` is a global PK (identical bytes across different users collide). If that is unacceptable, it requires a schema change; out of scope for this doc.


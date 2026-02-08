# PRD Technical Specification v3.0 (Draft) - Canonical Output Contract + User-Defined Schemas

Status: Draft (v3.0 = aligned to `docs/product-defining-v2.0/0207-blocks.md` + `docs/product-defining-v2.0/0207-immutable-fields.md`)
Last updated: 2026-02-07

This is Document 2 (future-oriented): how the PRD maps to architecture, with the **canonical output contract** that development must implement.

Companion documents (same directory):
- `docs/product-defining-v2.0/0207-prd-doc1.md` (Document 1: product vision, capabilities, users, success criteria, platform boundary)
- `docs/product-defining-v2.0/0207-defining-user-defined-schemas.md` (use case illustrations: UC1–4 with full schema artifacts and concrete exports)

Primary source material (canonical for v3.0):
- `docs/product-defining-v2.0/0207-blocks.md` (block types + hybrid block extraction requirement)
- `docs/product-defining-v2.0/0207-immutable-fields.md` (vNext immutable field names + deterministic identity rules)
- `repo-rules.jsonl` and `repo-changelog.jsonl` (decision history + drift control)

Reference repos (evidence for structured models):
- `ref-repos/docling/docs/concepts/docling_document.md` (DoclingDocument reading order via `body` tree; JSON-pointer addressing)
- `ref-repos/mdast/readme.md` (mdast node set + GFM extensions such as tables)
- `ref-repos/pandoc/doc/filters.md` (Pandoc AST exists and supports a JSON representation)

Example user-defined schema artifact (repo-local):
- `docs/tests/user-defined/prose-optimizer-v1.schema.json`
  - Legacy note: the example currently describes outputs using `annotation.*` naming; this v3.0 spec standardizes the exported mutable key as `user_defined.*` (see Section 9).
- Additional schema examples (10+ artifacts) are defined inline in `0207-defining-user-defined-schemas.md` — UC1 through UC4.

---

## 1) Core Invariants

1. **Immutable is never mutated after ingest**
   - After ingest completes, the extracted immutable substrate is fixed.

2. **User-defined schemas are overlays, not edits to immutable**
   - All schema outputs (tags, extracted fields, rewrites, comments, signals) live in a mutable overlay layer.

3. **Multi-schema is a first-class requirement**
   - A single document's immutable block inventory must support attaching many schemas.
   - A single schema must be reusable across many documents.

4. **The export format is the contract**
   - Canonical output is JSON (per block) and JSONL (one JSON per line).
   - The database is storage; export is assembled on demand.

---

## 2) Governance Notes (Preventing Drift During Migration)

This repo is mid-transition from legacy naming/contracts to the vNext naming convention.

This document is normative for the v3.0 export contract:
- The immutable contract is anchored in `docs/product-defining-v2.0/0207-immutable-fields.md`.
- The block-type and hybrid-extraction contract is anchored in `docs/product-defining-v2.0/0207-blocks.md`.

Legacy docs (and some example artifacts) may still use:
- `doc_uid`, `md_uid`, `char_span`, `section_path`
- `annotation` as the mutable overlay key

This v3.0 spec keeps a single canonical export shape and includes an explicit legacy mapping section (Section 9) so development can proceed without ambiguity.

---

## 3) Entities (How Multi-Schema Works)

These entities describe the *intended design contract* for Phase 1 + Phase 2.

- **Source upload (pre-conversion upload identity):**
  - Identified by `immutable.source_upload.source_uid`.
  - Meaning: identity of the uploaded source bytes (before any conversion).

- **Conversion / Document (immutable substrate identity for block inventory):**
  - Identified by `immutable.conversion.conv_uid`.
  - Meaning: identity of the converted representation bytes that were parsed to produce the block inventory.
  - Note: `conv_uid` is the stable "document identity" for the block inventory in v3.0.

- **Block (atomic unit in reading order):**
  - Identified by `immutable.block.block_uid`.
  - Recommended derived form: `block_uid = conv_uid + ":" + block_index`.

- **Schema (user-defined schema artifact):**
  - A reusable schema definition owned by a user.
  - Stable identifiers:
    - `schema_ref` (user-facing slug)
    - `schema_uid` (content hash of canonicalized schema JSON)

- **Run (schema attached to a document for one execution instance):**
  - A binding of one `conv_uid` to one schema for a specific execution instance.
  - Identified by `run_id`.

- **Overlay (per-block user-defined output for a run):**
  - One overlay payload per `(run_id, block_uid)`.
  - This overlay is what becomes `user_defined.data` at export time for that run.

This creates the many-to-many relationship you want:
- A **document (conv_uid)** has many schema attachments (many runs).
- A **schema** appears on many documents (many runs).

UI implications (product requirements):
- Document detail view shows all attached schemas (runs) for that document.
- Schema detail view shows all documents that have runs using that schema.
- **Block viewer** — the primary interface for reviewing results in online mode (Section 4.3). The block viewer displays blocks as rows with two column regions:
  - **Left (fixed):** immutable fields — `block_index`, `block_type`, `block_content` (preview/expandable). Same columns for every document.
  - **Right (dynamic):** overlay fields from `user_defined.data` — column headers derived from the schema artifact's field keys. Different columns per schema run. A run selector at the top switches which schema's overlay columns are displayed.
  - **Status column:** per-row `pending` / `processing` / `complete` indicator. In online mode, rows update as workers complete blocks.
  - The block viewer is the live equivalent of the JSONL export: `blocks JOIN block_overlays ON block_uid WHERE run_id = ?`, rendered as a table.

---

## 4) Schema Artifact Format (What Users Upload)

The repo contains an example user-defined schema artifact:
- `docs/tests/user-defined/prose-optimizer-v1.schema.json`

This artifact describes the expected shape of **per-block** user-defined output:
- It defines the shape that ends up under `user_defined.data` at export time (Phase 2), not the immutable substrate.

### 4.1 Opaque JSON Principle

Schema artifacts are **opaque JSON**. The platform stores them without interpreting their internal structure. The platform validates only:

1. The artifact is a valid JSON object.
2. It has a `schema_ref` key whose value is a string.

Everything else — field definitions, instructions, reference material, enum values, nested objects — is user-controlled. The platform does not parse `fields`, does not enforce field types, and does not read `instructions` or `reference_material`. These keys exist for the AI worker's benefit, not the platform's.

This means users can include anything in their schema artifact: Strunk's 18 rules as `reference_material`, a Bluebook signal taxonomy, a defined terms list from a contract, or nothing beyond `schema_ref` and a few field names. The platform stores it, computes `schema_uid`, and serves the full artifact to workers alongside each block.

Validation approach (v0):
- Validate: schema artifact is a JSON object + has `schema_ref` (string).
- No generalized meta-schema is required for v0 (hard-coded validator is acceptable).
- Richer validation (JSON Schema enforcement, field type checking) can be handled by external services at the API boundary — see PRD Section 7 (Platform Boundary).

### 4.2 Worker Contract

When an AI worker claims a block for processing, it receives exactly two inputs:

1. **`block_content`** — the immutable text of the block (one paragraph, one clause, one heading, etc.)
2. **The full schema artifact** — the entire opaque JSON the user uploaded, including `schema_ref`, `instructions`, `reference_material`, `fields`, and any other keys the user included

The worker reads the block content, follows the schema's instructions, and returns one output:

- **`user_defined.data`** — a JSON object whose keys correspond to the schema's field definitions

The platform writes this output as the overlay for `(run_id, block_uid)`. At export time, it becomes `user_defined.data` in the canonical block record.

The platform does not constrain which AI model serves as the worker backend. Any LLM API (OpenAI, Anthropic, Google, open-source endpoints) can fill this role. The contract is: receive block content + schema artifact → return filled `user_defined.data`.

### 4.3 Two Processing Modes: Online and Export

The block inventory + overlay model supports two first-class modes of interaction. Both read from the same underlying tables.

**Online mode (in-platform):**

The user views blocks and their overlays directly in the platform's web interface. As AI workers process blocks, rows transition from `pending` → `processing` → `complete` in the block viewer. The user reviews results in-browser without downloading anything.

This is the primary experience for single-document use cases: a general counsel reviewing a contract clause by clause, a writer checking paragraph edits, a researcher examining extraction results before refining a schema.

The block viewer is a live projection of `blocks JOIN block_overlays ON block_uid WHERE run_id = ?`.

**Export mode (JSONL download):**

The user downloads a JSONL file for external pipelines (DuckDB, Neo4j, custom scripts, analytics platforms). Each line is one block with the canonical two-key shape (`immutable` + `user_defined`). Export is the same join as the online view, serialized to JSONL.

This is the primary experience for corpus-scale use cases: 28,000 documents × 5 schemas → JSONL streams consumed by a KG assembly pipeline or loaded into an analytics database.

Both modes are first-class. The online mode is where most users spend their time; the export mode is where downstream systems consume the platform's output.

---

## 5) Canonical Output: One Block Record (JSON)

Each exported block is one JSON object with exactly two top-level keys:

- `immutable`: deterministic substrate derived at ingest time.
- `user_defined`: user-defined schema overlay for a specific schema attachment (run).

### 5.1 Canonical Shape

```json
{
  "immutable": {
    "source_upload": {
      "source_uid": "...",
      "source_type": "md",
      "source_filesize": 12345,
      "source_total_characters": 12000,
      "source_upload_timestamp": "2026-02-07T00:00:00Z"
    },
    "conversion": {
      "conv_status": "success",
      "conv_uid": "...",
      "conv_parsing_tool": "mdast",
      "conv_representation_type": "markdown_bytes",
      "conv_total_blocks": 555,
      "conv_block_type_freq": { "paragraph": 255, "heading": 55 },
      "conv_total_characters": 123456
    },
    "block": {
      "block_uid": "...",
      "block_index": 37,
      "block_type": "paragraph",
      "block_locator": { "type": "text_offset_range", "start_offset": 0, "end_offset": 0 },
      "block_content": "..."
    }
  },
  "user_defined": {
    "schema_ref": null,
    "schema_uid": null,
    "data": {}
  }
}
```

The example above shows the **mdast track** (Markdown source). The **Docling track** (non-Markdown source) produces a different shape for the same two-key contract:

```json
{
  "immutable": {
    "source_upload": {
      "source_uid": "...",
      "source_type": "docx",
      "source_filesize": 284672,
      "source_total_characters": null,
      "source_upload_timestamp": "2026-02-07T09:00:00Z"
    },
    "conversion": {
      "conv_status": "success",
      "conv_uid": "...",
      "conv_parsing_tool": "docling",
      "conv_representation_type": "doclingdocument_json",
      "conv_total_blocks": 214,
      "conv_block_type_freq": { "heading": 18, "paragraph": 162, "list_item": 24, "table": 6, "page_header": 2, "page_footer": 2 },
      "conv_total_characters": 89340
    },
    "block": {
      "block_uid": "...",
      "block_index": 47,
      "block_type": "paragraph",
      "block_locator": { "type": "docling_json_pointer", "pointer": "#/texts/47", "page_no": 12 },
      "block_content": "..."
    }
  },
  "user_defined": {
    "schema_ref": null,
    "schema_uid": null,
    "data": {}
  }
}
```

Key differences between tracks:

| | mdast track | Docling track |
|:--|:--|:--|
| `source_type` | `md` | `docx`, `pdf`, `pptx`, `html`, etc. |
| `source_total_characters` | integer (text readable from source bytes) | `null` (binary format) |
| `conv_parsing_tool` | `mdast` | `docling` |
| `conv_representation_type` | `markdown_bytes` | `doclingdocument_json` |
| `block_locator.type` | `text_offset_range` | `docling_json_pointer` |

Both tracks produce the same canonical two-key export shape. The pairing rules (Section 10.3) enforce valid combinations.

Notes:
- Phase 1 keeps `user_defined` inert (null schema identifiers + empty `data`).
- Phase 2 populates `user_defined` from the run + overlays (see below).
- Legacy docs and artifacts may use the key name `annotation` for what is conceptually the same mutable overlay. This v3.0 spec standardizes the exported mutable key as `user_defined` (Section 9).

### 5.2 Deterministic Definitions (to Prevent Drift)

These rules are load-bearing and must match `docs/product-defining-v2.0/0207-immutable-fields.md`.

- `"\n"` in formulas is a literal newline separator to prevent ambiguous concatenation.

- `source_uid`:
  - `source_uid = sha256(source_type + "\n" + raw_source_bytes)`

- `conv_uid`:
  - `conv_uid = sha256(conv_parsing_tool + "\n" + conv_representation_type + "\n" + conv_representation_bytes)`
  - Suggested `conv_representation_type` values:
    - `markdown_bytes` (Markdown text bytes)
    - `doclingdocument_json` (DoclingDocument JSON bytes)
    - `pandoc_ast_json` (Pandoc JSON AST bytes)
  - `conv_representation_bytes` must be serialized deterministically (UTF-8 for Markdown; stable JSON serialization for Docling/Pandoc AST).

- `block_index`:
  - `block_index` is 0-based and MUST range over `0..conv_total_blocks-1`.

- `block_uid`:
  - Recommended derived form: `block_uid = conv_uid + ":" + block_index`

- `schema_uid`:
  - `schema_uid = sha256(canonical_json_bytes(schema_artifact))`
  - `canonical_json_bytes` means deterministic JSON serialization: sorted keys, no trailing whitespace, consistent numeric formatting, UTF-8 encoded.
  - Two schema artifacts with identical content produce the same `schema_uid` regardless of key ordering in the original upload.

- `conv_total_characters`:
  - Explicit definition: `sum(len(block_content))` across all blocks.

### 5.3 `block_locator` Contract (Tool-Specific Provenance Pointer)

`block_locator` MUST be a typed object whose schema depends on the `conv_parsing_tool` + `conv_representation_type`.

Examples (non-exhaustive):
- For `mdast` over `markdown_bytes`:
  - `{ "type": "text_offset_range", "start_offset": 123, "end_offset": 456 }`
- For Docling over `doclingdocument_json`:
  - `{ "type": "docling_json_pointer", "pointer": "#/texts/5", "page_no": 3 }`
- For Pandoc over `pandoc_ast_json` (if used):
  - `{ "type": "pandoc_ast_path", "path": ["blocks", 12] }`

---

## 6) Canonical Output: JSONL (One Block Record Per Line)

JSONL is newline-delimited JSON:
- Each line is exactly one block record (the JSON shape above).
- A JSONL file is the ordered concatenation of those lines.

Ordering rule:
- Export MUST order by `immutable.block.block_index` ascending (stable reading order).

Export variants:
- **Phase 1 export** (immutable only): parameterized by `conv_uid`.
  - `user_defined` is always inert: `{ "schema_ref": null, "schema_uid": null, "data": {} }`
- **Phase 2 export** (immutable + a specific schema overlay): parameterized by `run_id`.
  - `user_defined.schema_ref` and `user_defined.schema_uid` are sourced from the run's schema.
  - `user_defined.data` is sourced from the run's per-block overlay payload for `(run_id, block_uid)`.

API parameter naming note (contract-level, not implementation-level):
- The Phase 1 export needs to identify the immutable substrate that owns the block inventory.
- In v3.0 that identifier is `conv_uid`, so the Phase 1 export contract is parameterized by `conv_uid`.
- Legacy docs may still describe Phase 1 export as parameterized by `doc_uid`; treat that as legacy aliasing to be reconciled.

Multi-schema note:
- A document with many attached schemas produces many Phase 2 JSONL exports (one per `run_id`), each representing one schema overlay over the same immutable block inventory.

---

## 7) Why This Design Exists (Intent)

This split is intentional:

- **Reuse without re-ingest:** run many distinct schemas (citation extraction, prose editing, KG metadata) over the same immutable blocks.
- **Provenance and auditability:** every derived field traces back to an immutable block with stable identity and a provenance pointer.
- **Parallelization:** the block inventory creates stable, independent units of work; workers can operate concurrently without colliding.
- **Comparability:** you can compare outputs across schemas, and across runs of the same schema, because the join key (`block_uid`) is stable.
- **No drift in the substrate:** you can evolve schemas and runs without mutating the original content/provenance.
- **Pipeline architecture:** the platform is a pipeline layer, not a monolith. Its value is the block infrastructure — deterministic decomposition, stable identities, opaque schema overlay, structured export. External services (AI backends, graph databases, analytics platforms, workflow tools) plug in at well-defined API boundaries. See PRD Section 7 (Platform Boundary) for the full integration architecture.

---

## 8) Block Types (Normative)

This section restates the block-type contract from `docs/product-defining-v2.0/0207-blocks.md` to remove implementation ambiguity.

### 8.1 Platform Block Type Enum

The platform's `immutable.block.block_type` MUST be one of:

- `heading`
- `paragraph`
- `list_item`
- `code_block`
- `table`
- `figure`
- `caption`
- `footnote`
- `divider`
- `html_block`
- `definition`
- `checkbox`
- `form_region`
- `key_value_region`
- `page_header`
- `page_footer`
- `other`

### 8.2 Mapping to Parser-Specific Types

The mapping below is the intended normalization rule:

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

Implementation note:
- For mdast, "GFM" adds additional node types (e.g., tables, footnotes) but they are still normalized into the same `platform_block_type` enum above.
- For DoclingDocument, reading order is determined by the `body` tree and the order of its children; `block_index` must follow that reading order.

---

## 9) Legacy Mapping (for Reconciling Older Docs)

This section exists to prevent drift while the repo is mid-transition.

- Legacy `doc_uid` -> v3.0 `conv_uid`
  - v3.0: document identity is the hash of the converted representation bytes that produced the block inventory.

- Legacy `md_uid` -> removed in favor of `conv_uid` + `conv_representation_type`
  - v3.0: `markdown_bytes` is one possible converted representation type.

- Legacy `char_span` -> v3.0 `block_locator` with `type = text_offset_range`

- Legacy `section_path` -> not part of the v3.0 immutable contract
  - If needed, it must be reintroduced explicitly as a defined field with deterministic derivation rules.

- Legacy `annotation` (mutable overlay key) -> v3.0 `user_defined`
  - v3.0 export uses `user_defined` as the canonical key.
  - During migration, schema examples and legacy docs may still describe overlays using `annotation.*`; treat that as legacy naming only.

---

## 10) Field + Enum Registry + Pairing Rules (Consolidated)

This section intentionally repeats information so you can review all related contract details in one place.

Status note:
- The immutable field names and shapes are canonical per `docs/product-defining-v2.0/0207-immutable-fields.md`.
- Some enums are only described as "string (enum)" with examples in the canonical docs; where a strict list is not canonically enumerated, this section labels it as **PROPOSED** (pending ratification).

### 10.1 Full Immutable Field Inventory (Canonical)

Top-level:
- `immutable` (object)

`immutable.source_upload` (object):
- `source_uid` (string; sha256 hex) — unique identifier for the uploaded **source bytes** (pre-conversion).
- `source_type` (string; enum) — the original uploaded source format (**PROPOSED strict list below**).
- `source_filesize` (integer; bytes) — size of the uploaded source file in bytes.
- `source_total_characters` (integer | null) — total character count of decoded **source text**; only meaningful for text-native sources (e.g., `md`, `txt`); otherwise `null`.
- `source_upload_timestamp` (string; ISO 8601) — timestamp when the source was uploaded.

`immutable.conversion` (object):
- `conv_status` (string; enum) — conversion/parsing outcome for the converted representation (**PROPOSED strict list below**).
- `conv_uid` (string; sha256 hex) — unique identifier for the **converted representation bytes** that were parsed to derive the block inventory.
- `conv_parsing_tool` (string; enum) — which tool produced the block inventory from the converted representation (**PROPOSED strict list below**).
- `conv_representation_type` (string; enum) — which representation was parsed to produce blocks (strict list is canonically suggested).
- `conv_total_blocks` (integer) — total number of blocks produced (inventory size).
- `conv_block_type_freq` (object map `string -> integer`) — frequency map by normalized block type (keys MUST be `block_type` values; see 10.3.4).
- `conv_total_characters` (integer) — total character count after conversion (definition in 10.4.5).

`immutable.block` (object):
- `block_uid` (string) — unique block identifier within a conversion (recommended derived form in 10.4.4).
- `block_index` (integer; 0-based) — block order in reading sequence (`0..conv_total_blocks-1`).
- `block_type` (string; enum) — normalized platform block type (CANONICAL strict list in 10.2.5).
- `block_locator` (object; typed locator) — provenance pointer back into the converted representation (schemas in 10.5).
- `block_content` (string) — immutable block content as represented in the converted representation (pre-overlay).

### 10.2 Strict Enum Lists (Canon vs Proposed)

#### 10.2.1 `source_type` (PROPOSED strict enum)

Proposed values (derived from `docs/product-defining-v2.0/0207-blocks.md` accepted types + the explicitly-supported `.md` path):

- `md`
- `txt` *(not listed in the Docling upload table in `0207-blocks.md`, but implied by the text-native `source_total_characters` note in `0207-immutable-fields.md` and by legacy docs; include or explicitly reject)*
- `docx`
- `pptx`
- `pdf`
- `html`
- `image`
- `asciidoc`
- `csv`
- `xlsx`
- `xml_uspto`
- `xml_jats`
- `mets_gbs`
- `json_docling`
- `audio`
- `vtt`

#### 10.2.2 `conv_status` (PROPOSED strict enum)

Proposed values (export-level outcomes; minimal set):

- `success`
- `partial_success`
- `failure`

#### 10.2.3 `conv_parsing_tool` (PROPOSED strict enum)

Proposed values:

- `mdast`
- `docling`
- `pandoc` *(only if `pandoc_ast_json` is actually used; otherwise omit)*

#### 10.2.4 `conv_representation_type` (CANONICAL suggested enum list)

Canonical suggested values (as listed in `docs/product-defining-v2.0/0207-immutable-fields.md`):

- `markdown_bytes`
- `doclingdocument_json`
- `pandoc_ast_json`

#### 10.2.5 `block_type` (CANONICAL strict enum list)

Canonical strict list (restated from `docs/product-defining-v2.0/0207-blocks.md`):

- `heading`
- `paragraph`
- `list_item`
- `code_block`
- `table`
- `figure`
- `caption`
- `footnote`
- `divider`
- `html_block`
- `definition`
- `checkbox`
- `form_region`
- `key_value_region`
- `page_header`
- `page_footer`
- `other`

#### 10.2.6 `block_locator.type` (CANONICAL exemplified locator-kinds list)

Canonical examples (as listed in `docs/product-defining-v2.0/0207-immutable-fields.md`):

- `text_offset_range`
- `docling_json_pointer`
- `pandoc_ast_path`

### 10.3 Pairing Rules (Strict)

These rules prevent invalid combinations across the hybrid ingestion paths.

#### 10.3.1 Parsing tool -> representation type

- If `conv_parsing_tool = mdast`:
  - MUST have `conv_representation_type = markdown_bytes`
- If `conv_parsing_tool = docling`:
  - MUST have `conv_representation_type = doclingdocument_json`
- If `conv_parsing_tool = pandoc`:
  - MUST have `conv_representation_type = pandoc_ast_json`

#### 10.3.2 Representation type -> locator kind

- If `conv_representation_type = markdown_bytes`:
  - `block_locator.type` MUST be `text_offset_range`
- If `conv_representation_type = doclingdocument_json`:
  - `block_locator.type` MUST be `docling_json_pointer`
- If `conv_representation_type = pandoc_ast_json`:
  - `block_locator.type` MUST be `pandoc_ast_path`

#### 10.3.3 Identity + ordering invariants

- `block_index` MUST be 0-based and cover `0..conv_total_blocks-1`.
- Recommended `block_uid` derived form:
  - `block_uid = conv_uid + ":" + block_index`

#### 10.3.4 `conv_block_type_freq` constraints

- `conv_block_type_freq` keys MUST be drawn from the `block_type` enum (10.2.5).
- `sum(values(conv_block_type_freq))` MUST equal `conv_total_blocks`.

### 10.4 Deterministic Formulas + Serialization Rules (Load-Bearing)

These rules must match `docs/product-defining-v2.0/0207-immutable-fields.md`. They are repeated here for Section 10 self-containment.

#### 10.4.1 Newline separator

- `"\n"` in formulas is a literal newline separator to prevent ambiguous concatenation.

#### 10.4.2 `source_uid`

- `source_uid = sha256(source_type + "\n" + raw_source_bytes)`

#### 10.4.3 `conv_uid` and deterministic `conv_representation_bytes`

- `conv_uid = sha256(conv_parsing_tool + "\n" + conv_representation_type + "\n" + conv_representation_bytes)`

Deterministic serialization requirements:
- If `conv_representation_type = markdown_bytes`: `conv_representation_bytes` MUST be the UTF-8 bytes of the canonical Markdown text.
- If `conv_representation_type = doclingdocument_json`: `conv_representation_bytes` MUST be produced via a deterministic JSON serialization (stable ordering and stable numeric formatting).
- If `conv_representation_type = pandoc_ast_json`: `conv_representation_bytes` MUST be produced via a deterministic JSON serialization (stable ordering and stable numeric formatting).

#### 10.4.4 `block_uid`

- Recommended derived form: `block_uid = conv_uid + ":" + block_index`

#### 10.4.5 `conv_total_characters`

- `conv_total_characters = sum(len(block_content))` across all blocks in the inventory.

#### 10.4.6 `schema_uid`

- `schema_uid = sha256(canonical_json_bytes(schema_artifact))`
- `canonical_json_bytes` means deterministic JSON serialization: sorted keys, no trailing whitespace, consistent numeric formatting, UTF-8 encoded.
- Two schema artifacts with identical content produce the same `schema_uid` regardless of key ordering in the original upload.

### 10.5 `block_locator` Schema (By `block_locator.type`)

`block_locator` MUST contain a `type` discriminator plus type-specific payload fields.

#### 10.5.1 `text_offset_range`

```json
{
  "type": "text_offset_range",
  "start_offset": 123,
  "end_offset": 456
}
```

Rules:
- `start_offset` and `end_offset` are integers.
- `0 <= start_offset <= end_offset`.

#### 10.5.2 `docling_json_pointer`

```json
{
  "type": "docling_json_pointer",
  "pointer": "#/texts/5",
  "page_no": 3
}
```

Rules:
- `pointer` is a string JSON-pointer-like reference into the DoclingDocument JSON.
- `page_no` is optional (include when available).

#### 10.5.3 `pandoc_ast_path`

```json
{
  "type": "pandoc_ast_path",
  "path": ["blocks", 12]
}
```

Rules:
- `path` is an array describing an address into the Pandoc JSON AST.

### 10.6 Normalization Mapping (Self-Contained Reference)

Section 8 contains the canonical normalization mapping table. It is restated here for convenience.

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

### 10.7 Upstream Label Inventories (For Implementers)

These are not platform enums, but they are listed in `docs/product-defining-v2.0/0207-blocks.md` and are commonly needed when writing normalization code.

DoclingDocument value-sets (as listed in `0207-blocks.md`):
- `DocItemLabel`: `TITLE, SECTION_HEADER, PARAGRAPH, TEXT, LIST_ITEM, CODE, TABLE, DOCUMENT_INDEX, PICTURE, FORMULA, CAPTION, FOOTNOTE, PAGE_HEADER, PAGE_FOOTER, CHECKBOX_SELECTED, CHECKBOX_UNSELECTED, FORM, KEY_VALUE_REGION`
- `GroupLabel`: `CHAPTER, SECTION, LIST, INLINE, PICTURE_AREA, COMMENT_SECTION, FORM_AREA, KEY_VALUE_AREA, UNSPECIFIED`
- `ContentLayer`: `BODY, FURNITURE, NOTES, INVISIBLE`

mdast node types (as listed in `0207-blocks.md`):
- `Heading, Paragraph, Blockquote, List, ListItem, Code, ThematicBreak, Definition, Html, Table, TableRow, TableCell, Delete, FootnoteDefinition, FootnoteReference`

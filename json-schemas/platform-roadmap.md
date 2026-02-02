# Platform Roadmap — Architecture-Grounded Capability Progression

This section maps every planned capability to the specific architectural primitive that already supports it. Nothing described here requires rearchitecting the core. Each tier activates latent capacity in the existing design.

---

## Tier 1: Document Intelligence Tool (Phase 1 → Phase 2)

**What it is:** Upload documents, produce block inventories, apply annotation schemas, export structured results.

### Phase 1 — Immutable Block Inventory (current build)

| Capability | Grounded In |
|---|---|
| Upload .md / .docx / .pdf / .txt | `documents.source_type` CHECK constraint; Docling microservice behind service architecture boundary |
| Deterministic block splitting | remark-parse → mdast; `blocks.block_uid` = SHA256(doc_uid + ":" + block_index) |
| Content-addressed identity | Three-hash model: `source_uid`, `md_uid`, `doc_uid` on `documents` table |
| Cross-format deduplication | `md_uid` = SHA256(raw_markdown_bytes) — converted .docx matching uploaded .md yields same `md_uid` |
| Block provenance | `block_type`, `section_path`, `char_span`, `content_original` as fixed Postgres columns on `blocks` |
| Conversion failure handling | `documents.status` enum + `documents.error` column + pg_cron stale cleanup |
| JSONL export (inert annotation) | Export assembles from `blocks JOIN documents ORDER BY block_index`; annotation placeholder: `{schema_ref: null, data: {}}` |
| Ownership isolation | RLS on `documents.owner_id = auth.uid()`; `blocks` derive ownership via FK join |

**Architectural invariant:** All writes via Edge Functions (service role key). No client-side mutations. Python microservice never touches Postgres.

### Phase 2 — Multi-Schema Annotation

| Capability | Grounded In |
|---|---|
| User-defined annotation schemas | `schemas` table — `schema_ref` TEXT PK, `schema_jsonb` JSONB (template/contract for annotation outputs) |
| Annotation runs | `annotation_runs` table — `run_id` UUID PK, FK to `documents.doc_uid` + `schemas.schema_ref` |
| Per-block annotation storage | `block_annotations` table — PK `(run_id, block_uid)`, `annotation_jsonb` JSONB |
| Same doc, multiple schemas, zero re-ingest | `block_annotations` references `blocks.block_uid` (immutable); each run writes separate rows |
| Parallel AI annotation | `FOR UPDATE SKIP LOCKED` claim pattern on `block_annotations` ordered by `blocks.block_index` |
| Live progress | Supabase Realtime subscription on `block_annotations.status` scoped to `run_id` |
| Run health tracking | `annotation_runs.completed_blocks`, `failed_blocks`, `failure_log` JSONB |
| JSONL export by run | Export joins `blocks` + `block_annotations` WHERE `run_id = $run_id` ORDER BY `block_index` |

**Architectural invariant:** Immutable block data is never duplicated or modified by annotation. Annotation is an overlay, not a mutation.

---

## Tier 2: Schema Platform (Post-Phase 2)

**What it is:** Non-technical users define, share, and discover annotation schemas without writing JSON. The schema becomes the product surface.

### Visual Schema Builder

| Capability | Grounded In | What Changes |
|---|---|---|
| Form-based schema definition | `schemas.schema_jsonb` already stores the full template/contract as JSONB | Add: Edge Function endpoint that validates + writes `schema_jsonb` from structured form input |
| Field type system (text, boolean, array, enum) | `schema_jsonb` is schema-agnostic JSONB — it stores whatever structure the annotation contract defines | Add: JSON Schema validation layer that enforces field type constraints at schema creation time |
| Per-field instruction prompts | Prompt template spec (Phase 2 build item) already defines "annotator receives content.original + schema template + rules" | Add: `schema_jsonb` includes per-field `instruction` keys consumed by the annotation worker's prompt assembly |
| Preview against sample block | `blocks.content_original` is already queryable; `schema_jsonb` defines expected output shape | Add: dry-run Edge Function that sends one block + schema to LLM and returns preview annotation |

**What does NOT change:** `schemas` table schema. `annotation_runs` execution model. `block_annotations` storage. The visual builder is a frontend that produces the same `schema_jsonb` a power user would upload as raw JSON.

### Schema Gallery

| Capability | Grounded In | What Changes |
|---|---|---|
| Browse prebuilt schemas | `schemas` table already supports N schemas per user | Add: `visibility` column (private / public / org) + `description` TEXT + `tags` TEXT[] to `schemas` |
| One-click apply to document | `annotation_runs` already binds `doc_uid` + `schema_ref` → run | No change — gallery selection feeds the same "start run" flow |
| Community-contributed schemas | `schemas.schema_ref` is a stable identifier; `schema_jsonb` is self-contained | Add: `author_id` UUID FK to auth.users; RLS policy for public read + owner write |
| Schema versioning | `schema_ref` is currently a flat string (e.g., `strunk_18`) | Add: `version` INTEGER column; composite unique on `(schema_ref, version)`; `latest` boolean or view |

**Architectural invariant:** A schema is a reusable template. It never contains document-specific data. The same `schema_ref` applies to any `doc_uid`.

---

## Tier 3: Integration Infrastructure (Post-Tier 2)

**What it is:** The block inventory and annotation outputs become the hub that external systems connect to. The platform becomes the document intelligence layer in a larger pipeline.

### Export Connectors

Each connector activates one of the four export branches already defined in the PRD. The block_uid is the universal join key across all paths.

| Export Branch (already defined) | Connector | Grounded In | What Changes |
|---|---|---|---|
| **JSONL file** | Archive / pipeline handoff | `blocks JOIN documents ORDER BY block_index`; parameterized by `run_id` for annotated export | Add: webhook on `annotation_runs.status = 'complete'` → POST JSONL to configured endpoint |
| **Document reconstruction** | Revised document export | `block_annotations.annotation_jsonb` carries `revised_text` per block; Pandoc converts assembled .md → .docx/.pdf/.html | Add: reconstruction Edge Function — `SELECT COALESCE(ba.annotation_jsonb->>'revised_text', b.content_original) FROM blocks b LEFT JOIN block_annotations ba ... ORDER BY b.block_index` → concatenate → Pandoc |
| **Knowledge graph ingest** | Graph DB push (Neo4j, etc.) | `block_annotations.annotation_jsonb` stores extracted entities/relations/triples per block under a KG-oriented schema | Add: KG export Edge Function — reads `annotation_jsonb` for a run, maps to graph triples with `block_uid` as provenance anchor, pushes to graph API |
| **Vector indexing** | Embedding pipeline | `blocks.content_original` is already a consistent, meaningful chunk with metadata (`block_type`, `section_path`, `doc_title`, `immutable_schema_ref`) | Add: vector export Edge Function — embeds `content_original` (optionally enriched with annotation signals) per block, writes to pgvector / Pinecone / Qdrant with `block_uid` as ID |

### Model Adapters

| Capability | Grounded In | What Changes |
|---|---|---|
| Swap LLM provider per run | Annotation worker pattern is model-agnostic: worker reads `content_original`, assembles prompt from `schema_jsonb`, calls LLM, writes `annotation_jsonb` | Add: `annotation_runs.model_config` JSONB column (provider, model, temperature, etc.); worker reads config at claim time |
| Local model support | Same claim pattern — `FOR UPDATE SKIP LOCKED` doesn't care what process fills `annotation_jsonb` | Add: worker variant that calls local inference endpoint instead of cloud API |
| Multi-model comparison | Same blocks, same schema, different `run_id` per model | Already supported: two runs with same `doc_uid` + `schema_ref` but different `model_config` produce separate `block_annotations` rows. Frontend toggle between runs on same block view |

**Architectural invariant:** The annotation contract is defined by `schema_jsonb`. The model is an execution detail. Any LLM that can read a prompt and return structured JSON can fill `annotation_jsonb`. The schema doesn't change. The storage doesn't change. The export paths don't change.

### Event System

| Capability | Grounded In | What Changes |
|---|---|---|
| Run completion webhook | Supabase Realtime already tracks `annotation_runs.status` changes | Add: database trigger on `annotation_runs` status → 'complete' fires pg_notify; Edge Function listens and POSTs to registered webhook URLs |
| Block failure alerts | `block_annotations.status = 'failed'` + `last_error` already tracked | Add: configurable alert threshold (e.g., >10% blocks failed → notify) |
| Document ingested event | `documents.status` transition to 'ingested' is already atomic | Add: pg_notify on status change; webhook Edge Function forwards to registered endpoints |

### REST API (Programmatic Access)

| Capability | Grounded In | What Changes |
|---|---|---|
| Programmatic upload | `POST /ingest` Edge Function already handles upload orchestration | Add: API key auth layer (Supabase API keys or custom token table); same Edge Function, different auth path |
| Trigger annotation run | Phase 2 "start run" Edge Function binds `doc_uid` + `schema_ref` → populates `block_annotations` | Add: expose as authenticated REST endpoint; return `run_id` for polling |
| Query block inventory | `GET /documents/:doc_uid/blocks` already planned in Phase 1 API contract | Add: pagination, filtering by `block_type`, `section_path` prefix |
| Retrieve annotation results | `block_annotations` keyed by `(run_id, block_uid)` | Add: `GET /runs/:run_id/annotations` with optional `block_uid` filter |

---

## Capability Dependency Chain

```
Phase 1 (Tier 1a)
  documents + blocks tables ← DEPLOYED
  Edge Functions: /ingest, /conversion-complete, /blocks, /export ← NEXT
  Storage buckets + Docling microservice
  Next.js: upload → status → block preview → export
      │
      ▼
Phase 2 (Tier 1b)
  schemas + annotation_runs + block_annotations tables
  Edge Functions: create schema, start run, claim/complete, export by run_id
  Annotation worker (LLM caller)
  Realtime subscriptions for live progress
      │
      ▼
Tier 2 — Schema Platform
  Visual schema builder (frontend generates schema_jsonb)
  Schema gallery (visibility + community sharing on schemas table)
  Schema versioning (version column + composite unique)
  Dry-run preview (one-block test annotation)
      │
      ▼
Tier 3 — Integration Infrastructure
  Export connectors (JSONL webhook, KG push, vector indexing, doc reconstruction)
  Model adapters (model_config on annotation_runs, swappable worker)
  Event system (pg_notify → webhook Edge Functions)
  REST API (authenticated programmatic access to existing Edge Functions)
```

Each tier depends only on the tier above it. No tier requires rearchitecting a previous tier. The block is always the universal unit. The schema is always the instruction set. The annotation run is always the execution model.

---

## What Is Architecturally Fixed vs. What Scales

**Fixed (will not change across tiers):**

- `blocks` table schema — immutable columns, fixed shape, universal envelope
- Three-hash identity model — `source_uid`, `md_uid`, `doc_uid`, `block_uid`
- `block_uid` as universal join key for all downstream systems
- Immutability rule — nothing under `immutable` is ever modified after ingest
- Service architecture boundary — Edge Functions own DB, Python owns conversion
- `annotation_jsonb` as the flexible output container shaped by `schema_jsonb`

**Scales additively (new columns, tables, or services — no breaking changes):**

- `schemas` table gains `visibility`, `version`, `author_id`, `description`, `tags`
- `annotation_runs` gains `model_config` JSONB
- New Edge Functions for export connectors, webhooks, REST API
- New worker variants for different LLM providers
- Frontend components for schema builder, gallery, multi-run comparison
- External service integrations (graph DBs, vector stores) are consumers — they read from the same tables via export Edge Functions

---

## Grounding Summary

Every capability in this roadmap traces to one of these architectural primitives:

| Primitive | Where It Lives | What It Enables |
|---|---|---|
| `block_uid` (SHA256, deterministic) | `blocks.block_uid` PK | Universal provenance anchor: every triple, vector, annotation, and export artifact traces to an exact paragraph |
| `content_original` (fixed column) | `blocks.content_original` | Retrieval-ready unit: consistent paragraph-level granularity with metadata, no separate chunking pipeline needed |
| `schema_jsonb` (JSONB template) | `schemas.schema_jsonb` | Pipeline instruction set: defines extraction objective, model-agnostic, reusable across documents |
| `annotation_jsonb` (JSONB output) | `block_annotations.annotation_jsonb` | Flexible structured output: KG triples, revised text, legal signals, embeddings metadata — all same storage |
| `FOR UPDATE SKIP LOCKED` | Concurrent claim pattern on `block_annotations` | Horizontal scaling: N workers process N blocks in parallel, no coordination overhead |
| `run_id` | `annotation_runs.run_id` UUID PK | Multi-lens isolation: same blocks, N schemas, N runs, zero re-ingest, independent results |
| Export branches (4 defined) | PRD §Export Branches | Multi-destination routing: JSONL, reconstructed doc, KG, vectors — all from same `block_uid` join key |
| Service boundary | Edge Functions (DB) / Python (Storage only) | Clean integration surface: new connectors attach to Edge Functions, never bypass the DB layer |

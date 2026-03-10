---
title: blockdata
description: >-
  Blockdata's pipeline vision has outgrown the docs that describe it. Existing
  docs cover pieces — the two-surface architecture, the priority queue,
  downstream integrations, docling integration — but no single document defines
  the complete pipeline as a development target. The direction has shifted:
  blockdata is no longer just a document-to-structured-data extraction tool.
  It's a data pipeline platform where parsed documents and loaded databases are
  inputs, transformable with dlt/dbt/MetricFlow/Python/user scripts, expressible
  in multiple views, and routable to multiple destinations.
comment: change the content
---

Blockdata's pipeline vision has outgrown the docs that describe it. Existing docs cover pieces — the two-surface architecture, the priority queue, downstream integrations, docling integration — but no single document defines the complete pipeline as a development target. The direction has shifted: blockdata is no longer just a document-to-structured-data extraction tool. It's a data pipeline platform where parsed documents and loaded databases are inputs, transformable with dlt/dbt/MetricFlow/Python/user scripts, expressible in multiple views, and routable to multiple destinations.

***

## 1. What Blockdata Is

Blockdata is a data pipeline platform. It ingests unstructured documents and structured data from multiple sources, parses them into addressable blocks, transforms and enriches those blocks through configurable stages — including LLM extraction, code-based transformations, and enrichment — supports human review, and routes confirmed outputs to multiple destinations. The pipeline is composable: stages can be arranged linearly (Transform surface) or as a user-defined DAG (Eternity Canvas).

***

## 2. Pipeline Stages

The pipeline has **11 stages**. Not every run uses every stage. The stages a run executes depend on the flow configuration — some flows are linear ingest-to-export; others branch, loop, or skip stages entirely.

### Stage 1: Source (Ingest)

**What it does:** Acquires raw input from a source and registers it in the platform.

**Inputs:**

* File upload (current: browser upload via `ingest` edge function)
* Cloud storage (future: Google Drive, Dropbox, S3/GCS connectors)
* Database (future: Postgres, BigQuery, Snowflake via dlt source connectors)
* API / webhook (future: incoming payload triggers)

**Outputs:**

* `source_documents` row (`source_uid`, `source_type`, storage key)
* Raw bytes in object storage

**Contract:** Every source produces a `source_uid` (content-addressed: `sha256(source_type + "\n" + raw_bytes)`) and a storage reference. The pipeline doesn't care where the data came from — only that it has a stable identity and retrievable bytes.

**Current implementation:** `supabase/functions/ingest/index.ts` — file upload only, routes by extension + policy.

***

### Stage 2: Parse / Convert

**What it does:** Transforms raw source material into a structured intermediate representation (IR) and extracts addressable blocks.

**Parsers:**

* **Docling** — PDF, DOCX, PPTX, XLSX, HTML, CSV, images, audio (via conversion service on Cloud Run)
* **mdast** — Markdown (in-process, edge function)
* **Pandoc** — fallback/alternative for supported formats

**Outputs:**

* `conversion_parsing` row (`conv_uid`, `parsing_tool`, `status`)
* `conversion_representations` row(s) (IR artifacts: mdast JSON, docling JSON, pandoc AST)
* `blocks` rows (`block_uid`, `block_type`, `block_content`, `block_index`)

**Contract:** Every parse produces a `conv_uid` (content-addressed: `sha256(tool + "\n" + rep_type + "\n" + rep_bytes)`). Blocks are deterministically split by the parser. Each block gets a stable `block_uid = conv_uid + ":" + block_index`.

**Current implementation:**

* `supabase/functions/ingest/process-md.ts` (mdast path)
* `supabase/functions/ingest/process-convert.ts` → Cloud Run conversion service → `supabase/functions/conversion-complete/index.ts` (docling/pandoc path)

***

### Stage 3: Chunk / Split

**What it does:** Re-groups, splits, or merges blocks based on a chunking strategy. This is an explicit stage between parse and downstream processing.

**Why it exists:** Parsers produce blocks at document-structural boundaries (paragraphs, headings, table rows). But downstream stages may need different granularity — token-budget chunks for LLM context windows, semantic chunks for embedding quality, heading-scoped groups for section-level analysis.

**Strategies** (configurable per flow):

* **Pass-through** — use parser blocks as-is (default, current behavior)
* **Token-budget** — merge small blocks / split large blocks to hit a target token range
* **Heading-scoped** — group blocks under their nearest heading ancestor
* **Semantic** — split on topic boundaries (requires embedding or classifier)
* **Custom** — user-defined chunking logic via flow script

**Outputs:** Chunked block set (may produce new derived block\_uids via `(conv_uid, chunk_strategy, range)`)

**Current implementation:** None — blocks flow directly from parse to extract today.

***

### Stage 4: Transform

**What it does:** Applies code-based transformations to blocks or datasets. This is where dlt, dbt, MetricFlow, Python scripts, and user-authored flow code execute.

This is new. The current pipeline jumps from parse → LLM extract. The Transform stage sits between them (or after them, or in parallel) and allows arbitrary data manipulation that doesn't require an LLM.

**Capabilities:**

* **dlt pipelines** — load/transform data from sources, normalize schemas
* **dbt models** — SQL-based transformations on block data or loaded tables
* **MetricFlow** — metrics layer for defining and computing measures
* **Python scripts** — arbitrary Python transformations (pandas, polars, custom logic)
* **Flow scripts** — user-authored code blocks (JavaScript/TypeScript or Python) that run as pipeline steps

**Contract:** Each transform step receives a dataset (blocks, table, or dataframe) and produces a transformed dataset. Transform steps are composable — they chain.

**Expression:** The Grid is one view of block data, but transformed data can be expressed as:

* Grid (current AG Grid view)
* Table (database-style query results)
* Chart / visualization
* JSON / tree view
* Document preview (rendered markdown, etc.)

**Current implementation:** None — this is entirely new infrastructure.

***

### Stage 5: Extract (LLM)

**What it does:** Runs an LLM against each block (or batch of blocks) using a user-defined schema. The schema defines fields (questions); the LLM reads source content + instructions + fields and returns filled-in answers.

**Inputs:**

* Blocks (from parse, chunk, or transform)
* Schema (fields + `prompt_config`)
* Model configuration (provider, model, temperature, etc.)

**Outputs:**

* `block_overlays` rows (`overlay_uid`, `block_uid`, status: `staged`)
* `overlay_jsonb_staging` — the LLM's structured response per block
* `runs` row tracking progress

**Three schema tracks** (emerge from schema design, not platform modes):

1. **Metadata enrichment** — LLM produces structured metadata about each block (source content unchanged)
2. **Content revision** — LLM produces revised content per block
3. **Combined** — both revision and metadata

**Contract:** Schema \= questions, not validation. The LLM reads source + instructions + fields, returns answers. JSON is the delivery container. No JSON Schema validation in the pipeline.

**Current implementation:** `supabase/functions/worker/index.ts` — Vertex AI Claude, adaptive batching, prompt caching, claim-based concurrency control.

***

### Stage 6: Enrich (Post-Extract)

**What it does:** Augments extracted data with derived metadata that requires cross-block or cross-document context — things the per-block LLM extraction can't produce in isolation.

**Enrichment types:**

* **Citations** — resolve citation references across blocks, link cited authorities
* **Cross-references** — link blocks that reference each other
* **Entity resolution** — deduplicate and normalize entities across blocks
* **Computed fields** — derived metrics (reading level, sentiment scores, statistical measures)
* **External lookups** — augment with data from external APIs or databases

**Contract:** Enrichment steps are additive — they never modify the original extraction overlay. They produce new overlay fields or separate enrichment records linked to block\_uids.

**Current implementation:** `supabase/functions/generate-citations/index.ts` exists but is a standalone function, not integrated as a pipeline stage.

***

### Stage 7: Review (Human-in-the-Loop)

**What it does:** Presents LLM-generated overlays for human review and confirmation. Nothing reaches the export boundary without human approval.

**Lifecycle:** `staged` → `confirmed` (or `rejected` → re-extract)

**Contract:** The review stage is a gate. Upstream stages produce `staged` overlays. The review stage transitions them to `confirmed`. Only `confirmed` overlays flow to downstream stages (embed, reconstruct, export).

**Expression:** Review can happen in:

* AG Grid (current — row-by-row overlay review)
* Side-by-side diff view (source vs. revised content)
* Batch approval interface
* (Future) custom review UIs per schema type

**Current implementation:** Grid-based review in ProjectDetail, overlay status management via `block_overlays` table.

***

### Stage 8: Embed (Vectorization)

**What it does:** Generates vector embeddings for blocks (or block + confirmed overlay pairs) and stores them for semantic search and retrieval.

**Inputs:**

* Block content + confirmed overlay fields
* Embedding model configuration (provider, model, dimensions)

**Outputs:**

* Vector embeddings stored in pgvector column(s) on blocks or a dedicated embeddings table
* Embedding metadata (model, dimensions, timestamp)

**Contract:** Embeddings are derived artifacts — they can be regenerated from source data. The embedding model and version are tracked for reproducibility.

**Current implementation:** Vertex AI `text-embedding-004` (768-dim) is configured (`GCP_VERTEX_SA_KEY` secret) but not wired into the pipeline as a stage.

***

### Stage 9: Reconstruct / Assemble

**What it does:** Reassembles confirmed blocks into output documents. For revision schemas, this means concatenating confirmed `revised_content` fields in `block_index` order to produce a complete revised document.

**Output formats:**

* Markdown (direct concatenation of `revised_content`)
* Formatted document (DOCX, PDF — requires template/styling)
* Structured dataset (flattened table from overlay fields)

**Contract:** Reconstruction consumes only `confirmed` overlays. Block ordering is deterministic via `block_index`. The output traces back to source via the immutable envelope.

**Current implementation:** Not implemented. Users can manually reconstruct from JSONL export.

***

### Stage 10: Export / Destination

**What it does:** Routes confirmed, enriched, optionally reconstructed data to its destination.

**Destinations:**

* **File export:** JSONL (canonical), CSV, Parquet, JSON
* **Database:** Direct write to Postgres, BigQuery, Snowflake (via dlt destination connectors)
* **Knowledge graph:** Neo4j (via `graph_mapping` in schema)
* **Vector store:** Pinecone, Weaviate, Qdrant, pgvector
* **Object storage:** S3/GCS with data catalog registration
* **Webhook:** POST to user-configured endpoint
* **API:** Query via platform API

**Contract:** The export boundary is confirmed, schema-conformant structured records with full provenance (immutable envelope + user\_defined overlay). Every record traces to its source.

**Current implementation:** `supabase/functions/export-jsonl/index.ts` — JSONL only.

***

### Stage 11: Observe / Monitor

**What it does:** Tracks pipeline execution state, performance metrics, cost, and quality signals across all stages.

**Signals:**

* Per-stage status and timing
* LLM token usage and cost
* Error rates and retry counts
* Data quality metrics (extraction confidence, review acceptance rates)
* Embedding coverage

**Current implementation:** Partial — run status tracking, worker telemetry (token usage), admin policy audit trail. No unified observability layer.

***

## 3. Pipeline Orchestration

### Linear (Transform Surface)

Stages execute in a fixed sequence. The user uploads → parsing happens automatically → they configure a schema → run extraction → review in grid → export. No branching, no custom ordering.

### DAG (Eternity Canvas)

Users compose stages as nodes in a visual graph. Each node is a pipeline stage (or a custom transform/script). Edges define data flow and dependencies. The execution engine resolves topological order. Supports:

* Parallel branches (e.g., extract with two different schemas simultaneously)
* Conditional routing (e.g., route tables to one schema, paragraphs to another)
* Multi-model routing (e.g., cheap classifier → expensive extractor)
* User-defined script nodes

### Triggers

* **Manual** — user clicks "Run" (current)
* **Schedule** — cron-based recurring execution
* **Event** — file arrival, webhook, database change
* **Chained** — completion of upstream flow triggers downstream flow

***

## 4. Multi-Model / Multi-Provider

The pipeline supports routing different stages to different LLM providers and models:

* **Classification / routing:** fast, cheap model (Haiku)
* **Extraction:** capable model (Sonnet, Opus)
* **Embedding:** dedicated embedding model (Vertex `text-embedding-004`, OpenAI ada)
* **Enrichment:** may use a different model than extraction

Provider transport is already abstracted (`vertex_ai` | `litellm_openai` in worker). This extends to per-stage model configuration.

***

## 5. The Action Catalog

The pipeline stages above are **categories**. The actual unit of composition is the **action** — a discrete function call that processes data. Users build flows by selecting actions from the catalog and wiring them together. The catalog is a growing registry; new actions are added as the platform evolves.

### Action Contract

Every action implements a uniform interface:

| Field           | Type   | Description                                                           |
| --------------- | ------ | --------------------------------------------------------------------- |
| `action_id`     | string | Unique identifier (e.g., `eyecite-extract-citations`)                 |
| `category`      | enum   | Catalog category                                                      |
| `runtime`       | enum   | Execution environment: `python`, `sql`, `llm-api`, `typescript`       |
| `label`         | string | Human-readable name                                                   |
| `input_schema`  | object | What the action expects (blocks, table, file, connection)             |
| `output_schema` | object | What the action produces (modified blocks, enrichment records, files) |
| `config_schema` | object | User-configurable parameters                                          |

Actions are composable — the output of one feeds the input of the next. Actions never mutate immutable block content; they produce new data or enrichment records alongside it.

### Categories

#### Ingest & Parse

Get data into the platform from any source. Every source normalizes into addressable blocks.

| Action                            | Description                                                                 | Runtime |
| --------------------------------- | --------------------------------------------------------------------------- | ------- |
| `docling-convert-pdf`             | Parse PDF via Docling with layout analysis, table structure, bounding boxes | python  |
| `marker-convert-pdf`              | Parse PDF via Marker, optimized for academic papers                         | python  |
| `pymupdf-extract-text`            | Fast text extraction from PDF via PyMuPDF, no layout analysis               | python  |
| `unstructured-partition-document` | Auto-detect format and partition via Unstructured                           | python  |
| `dlt-load-postgres`               | Load tables from PostgreSQL via dlt source connector                        | python  |
| `dlt-load-api`                    | Load data from a REST API via dlt source connector                          | python  |

#### Text Cleanup

Fix encoding, whitespace, and formatting artifacts before downstream processing.

| Action                    | Description                                | Runtime |
| ------------------------- | ------------------------------------------ | ------- |
| `ftfy-fix-encoding`       | Fix mojibake and encoding errors           | python  |
| `normalize-whitespace`    | Collapse spaces, normalize line breaks     | python  |
| `normalize-quotes`        | Convert smart quotes to ASCII              | python  |
| `normalize-hyphens`       | Normalize em/en dashes and special hyphens | python  |
| `strip-boilerplate`       | Remove headers, footers, page numbers      | python  |
| `clean-unicode-artifacts` | Remove zero-width chars, BOM markers       | python  |

#### Block Structure

Restructure parser-produced blocks to match downstream needs.

| Action                    | Description                                                     | Runtime |
| ------------------------- | --------------------------------------------------------------- | ------- |
| `merge-runon-blocks`      | Merge blocks incorrectly split mid-sentence                     | python  |
| `split-oversized-blocks`  | Split blocks exceeding a token threshold at sentence boundaries | python  |
| `reclassify-block-types`  | Re-evaluate block types using heuristics or classifier          | python  |
| `reindex-block-positions` | Recalculate block\_index after merges, splits, or deletions     | python  |

#### Domain-Specific

Specialized extraction using domain libraries. Legal is the first domain; the pattern extends to medical, financial, academic, and others.

| Action                       | Description                                                    | Runtime |
| ---------------------------- | -------------------------------------------------------------- | ------- |
| `eyecite-extract-citations`  | Extract legal citations with reporter, volume, page            | python  |
| `eyecite-resolve-shortcites` | Resolve "Id.", "supra" to full antecedent citations            | python  |
| `build-shepard-edges`        | Construct treatment edges (followed, distinguished, overruled) | python  |
| `build-bluebook-edges`       | Construct citation edges following Bluebook format             | python  |
| `classify-court-hierarchy`   | Classify court level and jurisdiction of cited authorities     | python  |

#### NLP / Entity

General-purpose NLP extraction — entities, tags, dependencies, deduplication, record linkage.

| Action                      | Description                                             | Runtime |
| --------------------------- | ------------------------------------------------------- | ------- |
| `spacy-extract-entities`    | Extract named entities (PERSON, ORG, DATE, GPE)         | python  |
| `spacy-tag-pos`             | Tag parts of speech per token                           | python  |
| `stanza-parse-dependencies` | Parse syntactic dependencies via Stanford Stanza        | python  |
| `dedupe-resolve-entities`   | Cluster variant spellings across blocks                 | python  |
| `splink-link-records`       | Probabilistic record linkage across blocks or documents | python  |

#### Transform (Code)

User-defined transformations using standard data tools. The escape hatch for anything without a built-in action.

| Action              | Description                                                | Runtime |
| ------------------- | ---------------------------------------------------------- | ------- |
| `dbt-run-model`     | Execute a dbt model against block data or loaded tables    | sql     |
| `python-run-script` | Run a user-authored Python script with sandboxed execution | python  |
| `sql-run-query`     | Execute a raw SQL query against the platform database      | sql     |

#### AI Extraction

LLM-powered extraction, classification, and revision. Schema defines the questions; the LLM answers them per block.

| Action                      | Description                                                        | Runtime |
| --------------------------- | ------------------------------------------------------------------ | ------- |
| `llm-extract-schema-fields` | Fill schema fields per block using LLM with prompt\_config         | llm-api |
| `llm-classify-blocks`       | Classify blocks into categories using a lightweight LLM call       | llm-api |
| `llm-revise-content`        | Generate revised content per block following revision instructions | llm-api |

#### Quality / Validation

Verify data quality before review or export.

| Action                        | Description                                                            | Runtime    |
| ----------------------------- | ---------------------------------------------------------------------- | ---------- |
| `validate-schema-output`      | Check overlay fields match expected types and constraints              | typescript |
| `detect-duplicate-blocks`     | Identify near-duplicate blocks using text similarity                   | python     |
| `score-extraction-confidence` | Score confidence per overlay using completeness and consistency checks | python     |

#### Export

Route confirmed data to destinations. Every export carries full provenance.

| Action           | Description                                                  | Runtime    |
| ---------------- | ------------------------------------------------------------ | ---------- |
| `export-jsonl`   | Export to JSONL — canonical format, one record per block     | typescript |
| `export-csv`     | Export to CSV — flattened columns                            | typescript |
| `export-parquet` | Export to Parquet — columnar, compressed, queryable in place | typescript |
| `push-to-neo4j`  | Push fields to Neo4j as nodes and edges per graph\_mapping   | typescript |
| `push-to-s3`     | Upload export files to S3/GCS with versioned naming          | typescript |
| `fire-webhook`   | POST run artifacts to a user-configured URL                  | typescript |

### Action Runtimes

Actions dispatch to one of four runtimes:

| Runtime      | Language          | Infrastructure                      | Used by                                             |
| ------------ | ----------------- | ----------------------------------- | --------------------------------------------------- |
| `python`     | Python 3.11+      | Cloud Run container                 | Parsers, NLP, text cleanup, domain libs, transforms |
| `sql`        | SQL / dbt         | Supabase Postgres + dbt runner      | dbt models, raw queries, MetricFlow                 |
| `llm-api`    | API calls         | Edge function → Vertex AI / LiteLLM | AI extraction, classification, revision             |
| `typescript` | TypeScript / Deno | Supabase Edge Functions             | Export, webhook, validation                         |

### Built-in vs. User-Defined

* **Built-in:** The catalog above ships with the platform. Maintained, tested, versioned.
* **User-defined:** Users write custom scripts (`python-run-script`, `sql-run-query`) that become reusable nodes in their flows.
* **Community (future):** Shared action registry where users publish and discover actions.
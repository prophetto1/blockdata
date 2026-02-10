# Downstream Integration Pipelines

**Platform:** BlockData
**Date:** 2026-02-09
**Scope:** What happens after confirmed overlays leave the platform — file-based pipelines, push integrations, and derived products

---

## What BlockData Produces

BlockData is a structured data factory. The raw material is unstructured documents. The output is schema-conformant structured records with full provenance.

At the export boundary, every confirmed block is a self-contained JSON object:

```json
{
  "immutable": {
    "source_upload": { "source_uid": "...", "source_type": "docx", "source_filesize": 48200, ... },
    "conversion": { "conv_uid": "...", "conv_parsing_tool": "docling", ... },
    "block": { "block_uid": "...", "block_type": "paragraph", "block_content": "...", ... }
  },
  "user_defined": {
    "schema_ref": "scotus_close_reading_v1",
    "schema_uid": "a3f8...",
    "data": {
      "rhetorical_function": "holding",
      "cited_authorities": ["Marbury v. Madison", "Chevron v. NRDC"],
      "revised_content": "..."
    }
  }
}
```

The `user_defined` overlay is entirely determined by the user's schema. The platform doesn't constrain what goes in it — it only ensures the AI worker fills it according to the schema's `prompt_config` and that a human confirms the result before it reaches the export boundary.

Multiply this by thousands of blocks across dozens of documents in a project, and you have a provenance-tagged, schema-conformant dataset that didn't exist before the platform touched those files.

Everything downstream consumes these records.

---

## The Three Schema Tracks

User-defined schemas drive three distinct tracks through the platform. These aren't platform-level modes — they emerge from how the user designs their schema fields and prompt instructions.

### Track 1: Metadata Enrichment

The schema instructs the AI to analyze each block and produce structured metadata *about* the source content without modifying it. The source content passes through unchanged; the overlay adds descriptive, analytical, or categorical labels.

**Example schema fields:**
```json
{
  "rhetorical_function": { "type": "string", "enum": ["holding", "dicta", "reasoning", "procedural"] },
  "cited_authorities": { "type": "array", "items": { "type": "string" } },
  "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
}
```

**What this produces:** A structured analytical layer over the original document. The source is untouched. The value is in the metadata — for search, filtering, analysis, knowledge graph construction, or training data.

### Track 2: Content Revision

The schema instructs the AI to produce a revised version of the source content according to rules specified in the `prompt_config`. The schema includes a `revised_content` field (string) that holds the rewritten block. When all confirmed blocks are reassembled in order, the result is a revised document.

**Example schema fields:**
```json
{
  "revised_content": { "type": "string" },
  "revision_type": { "type": "string", "enum": ["style", "clarity", "compliance", "translation"] },
  "changes_made": { "type": "array", "items": { "type": "string" } }
}
```

**What this produces:** A transformed document — rewritten for a new audience, updated to comply with a style guide, translated, simplified, or restructured. A planned `reconstruct` edge function (Phase 7.2, not yet implemented) will reassemble confirmed `revised_content` fields into a complete output document. Until then, users can reconstruct from the JSONL export by ordering blocks by `block_index` and concatenating `revised_content` values. Every revision is block-level, human-confirmed, and traceable to its source.

### Track 3: Revision + Enrichment (Combined)

The schema instructs the AI to both revise the content *and* produce metadata about the revision. This is the most powerful track: the source content flows through a transformation pipeline, and the output carries both the revised text and structured annotations describing what changed and why.

**Example flow:**

```
Source block content
    ↓
Schema prompt_config: "Revise for plain-language compliance.
    For each block, rewrite to a 6th-grade reading level
    and tag the rhetorical function."
    ↓
AI worker output (overlay):
{
  "revised_content": "The court decided that...",
  "original_reading_level": "graduate",
  "revised_reading_level": "6th_grade",
  "rhetorical_function": "holding",
  "simplification_notes": "Replaced legal jargon with plain equivalents"
}
    ↓
Confirmed overlay → export
    ↓
Reconstruction (planned): revised_content fields → complete plain-language document
Metadata export: structured analysis of every revision decision
```

**What this produces:** A revised document *plus* a structured dataset describing every transformation. The metadata is itself a valuable artifact — it can feed into quality assurance, compliance audits, training data for future models, or analytical dashboards showing revision patterns across a corpus.

This combined track is where BlockData's architecture pays off most. The block-level granularity means every revision decision is isolated, reviewable, and reversible. The staging layer means nothing reaches the export boundary without human confirmation. And the immutable envelope means every output record traces back to its exact source.

---

## Tier 1 — File-Based Pipelines

These are the lowest-friction integrations. No running services required — just export in the right shape.

### Fine-Tuning Datasets

Confirmed overlays are supervised training examples: input (block content) → output (structured extraction per schema). Export as JSONL in the format Anthropic or OpenAI expect for fine-tuning and you've built a domain-specific data labeling platform.

The staging/confirm flow is the quality gate. A legal team annotating 5,000 blocks of case law with `rhetorical_function`, `holding`, and `cited_authority` is simultaneously building a training set. The provenance envelope means every training example traces to its source document, conversion method, and block identity — which matters for dataset auditing and bias detection.

For the revision track, fine-tuning data captures the transformation itself: source content → revised content, paired with the revision metadata. This trains models to perform the same kind of revision autonomously.

### Evaluation and Benchmark Datasets

Confirmed overlays become gold-standard evaluation items. Export JSONL where each record is a test case: block content as input, confirmed overlay as expected output. Version these by schema + run for reproducible evaluation sets with full provenance.

This connects directly to benchmark engineering. A corpus of 10,000 confirmed legal annotations, each with a known-correct `rhetorical_function` and `cited_authorities` list, is an evaluation benchmark. The immutable identity model ensures test items are stable across evaluation runs — the same `block_uid` always refers to the same content.

### Analytical Datasets (CSV, Parquet → DuckDB, Pandas, R)

Flatten the overlay fields into columns, export as CSV or Parquet, and the result is a dataset ready for statistical analysis. A researcher studying rhetorical patterns in Supreme Court opinions doesn't need to understand the platform — they need a CSV with `block_type`, `rhetorical_function`, `cited_authority`, `opinion_section` columns and 50,000 rows.

Parquet is preferable for large datasets because it's columnar and compressed, and DuckDB can query it directly without loading into memory. A single Parquet file containing all confirmed overlays for a 77-document project is a self-contained analytical artifact.

### Vector Embedding Pipelines

Export block content + confirmed metadata as JSONL, run through an embedding model (OpenAI, Cohere, local), and load into a vector store (Pinecone, Weaviate, Qdrant, pgvector). The metadata fields from overlays become filterable attributes in the vector store — enabling semantic search *within* a rhetorical function or *within* a document section.

This is where block-level granularity pays off vs. naive chunking. Each block has a known type, known position in the document structure, and confirmed metadata. A RAG system can retrieve blocks where `block_type = 'paragraph' AND rhetorical_function = 'holding'` and feed only holdings to the generation model. The overlay metadata enables precision retrieval that raw chunking cannot match.

---

## Tier 2 — Push-Based Integrations

These require configuration but no user-side code. The platform calls the destination.

### Knowledge Graph Construction (Neo4j)

The schema's `graph_mapping` key tells the platform how to translate overlay fields into nodes and edges. A `cited_authority` field becomes an edge from the citing block to a `Case` node. A `rhetorical_function` becomes a property on the block node.

Run this across 77 documents and you get a citation network, argument structure graph, or concept map — automatically, from confirmed overlays. The user designs the schema; the platform builds the graph.

For the combined track, the knowledge graph can represent both the revision relationships (source block → revised block) and the metadata relationships (block → cited authority, block → rhetorical function). This produces a graph that encodes both the structure of the original corpus and the structure of its transformation.

### Webhook → ETL Pipelines

On run confirmation, POST the JSONL to a user-configured endpoint. That endpoint could be an Airflow DAG trigger, a Zapier/Make webhook, a custom FastAPI service that does further processing, or a data warehouse loader.

The platform doesn't need to know what's downstream. It delivers structured, confirmed records to a URL. The webhook payload is the same canonical JSONL shape as the file export — consumers don't need separate integration logic.

### Object Storage (S3/GCS) + Data Catalog

Export confirmed runs as versioned Parquet files to a cloud bucket, register them in a data catalog (Iceberg, Delta Lake, or a structured naming convention). Annotation outputs become queryable via Trino, Athena, or BigQuery without additional infrastructure.

Each run becomes a partition. Each schema version becomes a table. The immutable envelope fields provide natural partition keys — `source_uid` for per-document queries, `conv_uid` for per-conversion queries, `schema_ref` for cross-document schema analysis.

---

## Tier 3 — Derived Products

These are things people build on BlockData's exports. The platform becomes infrastructure.

### RAG with Structured Retrieval

Instead of naive "chunk and embed," confirmed blocks carry semantically typed metadata. A RAG system retrieves blocks matching both semantic similarity *and* metadata constraints, producing higher-precision context for generation.

The revision track adds another dimension: RAG systems can retrieve the *revised* version of blocks when the use case calls for simplified, translated, or otherwise transformed content, while maintaining traceability to the original source.

### Compliance and Audit Datasets

Regulated industries need to show their work. The immutable envelope (source hash, conversion hash, block locator) is a provenance chain. Confirmed overlays form an audit trail: this extraction was produced by model X, reviewed by user Y at time Z, from source document with hash W.

For revision workflows, the audit trail is even richer: the original content, the revision instructions (schema + prompt_config), the AI's revision, the human's edits to that revision, and the final confirmed version — all linked by block identity.

### Multi-Schema Cross-Referencing

Apply two different schemas to the same document — `legal_structure_v1` and `rhetorical_analysis_v1`. Export both as JSONL keyed by `block_uid`. Join them: which rhetorical moves appear in which structural sections?

Or apply a metadata schema first, then a revision schema informed by the metadata results. The block identity model makes this composable — overlays from different runs on the same blocks can be joined, compared, or layered.

### Batch Document Transformation

The revision track at corpus scale. Upload 77 documents, apply a revision schema ("rewrite to plain language" or "update to 2026 style guide"), run the AI worker across all blocks with concurrent processing, review and confirm in the grid, then reconstruct all 77 revised documents.

This is batch document transformation with human review at every block, full provenance, and structured metadata about every revision decision. The output is both the revised corpus and the analytical dataset describing the transformation.

---

## Canonical Export Formats

| Format | Best For | Notes |
|---|---|---|
| **JSONL** | ML pipelines, fine-tuning, evaluation sets, webhook payloads, inter-system transfer | One record per line, streaming-friendly, preserves nested structure. Canonical platform format. |
| **CSV** | Analyst handoff, spreadsheet review, quick exploration | Flat, universal. Loses nested overlay structure — fields are flattened to columns. |
| **Parquet** | Analytical queries at scale, data lake storage, warehouse loading | Columnar compression, schema-embedded, queryable in place via DuckDB/Trino/Athena. |
| **JSON** | API responses, single-document inspection, debugging | Good for small payloads, not suitable for large dataset export. |

JSONL is the canonical format. CSV and Parquet are derived views for specific consumers. The platform exports JSONL; connectors or user scripts reshape it for their destination.

---

## Design Principle

BlockData's job ends at confirmed, schema-conformant JSONL with provenance. Everything downstream is a consumer of that artifact. The cleaner and more predictable the export boundary, the more integrations become trivial to build — whether as platform features or by users with a Python script and `pandas.read_json()`.

The three schema tracks (metadata enrichment, content revision, combined) all produce the same canonical output shape. Downstream consumers don't need to know which track produced a record — they consume the `user_defined.data` fields according to the schema. The track distinction lives in the schema design, not in the platform's export machinery.

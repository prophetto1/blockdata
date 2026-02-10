---
title: Integrations
description: Downstream pipelines — what you do with BlockData's structured JSONL output.
sidebar:
  label: Overview
  order: 0
---

BlockData's job ends at confirmed, schema-conformant JSONL with provenance. Everything downstream consumes that artifact.

## Three tiers

### Tier 1 — File-Based (lowest friction)

No running services required. Export in the right shape and consume.

- **[Fine-Tuning Datasets](/docs/integrations/fine-tuning/)** — Confirmed overlays as supervised training examples
- **Evaluation/Benchmark Sets** — Versioned gold-standard test cases with full provenance
- **Analytical Datasets** — Flatten to CSV or Parquet for DuckDB, Pandas, R
- **Vector Embeddings** — Block content + metadata for semantic search pipelines

### Tier 2 — Push-Based (configuration, no user code)

The platform calls the destination.

- **[Knowledge Graphs](/docs/integrations/knowledge-graphs/)** — Neo4j construction from graph-aware schema overlays
- **Webhook ETL** — POST JSONL to a user-configured endpoint on run confirmation
- **Object Storage** — Versioned Parquet files to S3/GCS with data catalog registration

### Tier 3 — Derived Products (built on the exports)

- **[Analytics](/docs/integrations/analytics/)** — DuckDB/Parquet, statistical analysis, dashboards
- **RAG with Structured Retrieval** — Block-level metadata enables precision retrieval
- **Compliance Audits** — Immutable provenance chain for regulated industries
- **Batch Document Transformation** — Corpus-scale revision with human review at every block

## The three schema tracks

User-defined schemas drive three distinct output profiles. These aren't platform modes — they emerge from schema design:

| Track | What the AI produces | Downstream use |
|-------|---------------------|----------------|
| **Metadata enrichment** | Structured metadata *about* the content | Search, filtering, KG construction, training data |
| **Content revision** | Revised version of the source content | Document reconstruction, translation, compliance rewriting |
| **Combined** | Revision + metadata | Revised corpus + analytical dataset of every transformation |

All three produce the same canonical JSONL shape. Downstream consumers don't need to know which track produced a record.

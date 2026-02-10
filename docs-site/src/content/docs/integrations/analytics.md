---
title: Analytics
description: Consuming BlockData exports in analytical pipelines — DuckDB, Parquet, CSV, and vector embeddings.
sidebar:
  order: 3
---

## Analytical datasets

Flatten overlay fields into columns, export as CSV or Parquet, and you have a dataset ready for statistical analysis.

**Example:** A legal researcher studying rhetorical patterns exports a CSV with columns: `block_type`, `rhetorical_function`, `cited_authority`, `opinion_section` — 50,000 rows across 28,000 opinions.

## Export formats

| Format | Tool | Best for |
|--------|------|----------|
| **JSONL** | Any | Canonical format, preserves nested structure |
| **CSV** | Excel, R, Pandas | Flat, universal — loses nested fields |
| **Parquet** | DuckDB, Trino, Athena | Columnar compression, queryable in place |

## DuckDB workflow

Parquet + DuckDB is the recommended path for large datasets:

```sql
-- Query a Parquet export directly (no loading step)
SELECT block_type, count(*)
FROM 'project-export.parquet'
GROUP BY block_type;
```

A single Parquet file containing all confirmed overlays for a 77-document project is a self-contained analytical artifact.

## Partition keys

The immutable envelope fields provide natural partition keys:

| Key | Use |
|-----|-----|
| `source_uid` | Per-document queries |
| `conv_uid` | Per-conversion queries |
| `schema_ref` | Cross-document schema analysis |
| `block_type` | Type-specific analysis |

## Vector embedding pipelines

Export block content + confirmed metadata as JSONL, run through an embedding model, and load into a vector store.

The overlay metadata fields become filterable attributes — enabling semantic search *within* a rhetorical function or *within* a document section:

```
query: "constitutional holding about due process"
filter: block_type = 'paragraph' AND rhetorical_function = 'holding'
```

Block-level granularity beats naive chunking:
- Each block has a known type and position
- Confirmed metadata enables precision retrieval
- `block_uid` provides stable vector IDs for re-embedding

### Supported vector stores

Pinecone, Weaviate, Qdrant, pgvector — any store that accepts structured metadata alongside embeddings.

## Object storage pattern

Export confirmed runs as versioned Parquet files to S3/GCS:

- Each run → a partition
- Each schema version → a table
- Register in a data catalog (Iceberg, Delta Lake) for warehouse queries via Trino, Athena, or BigQuery

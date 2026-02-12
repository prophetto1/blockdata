---
title: Zvec Adapters and Transformers
description: Required translators and adapters to ingest JSON/JSONL/CSV/MD/TXT into Zvec.
sidebar:
  order: 2
---

**Spec version:** v0.1  
**Date:** 2026-02-12  
**Source:** `docs/integrations/zvec/zvec-adapters-and-transformers.md`  
**Status:** Prescriptive - pre-implementation target

---

## Scope

This page defines the adapter layer required to operationalize the Zvec integration:
- source adapters for JSON/JSONL/CSV/MD/TXT,
- canonical translation boundary (`vector_record_v1`),
- embedding and Zvec upsert adapter responsibilities.

---

<!-- BEGIN VERBATIM COPY from docs/integrations/zvec/zvec-adapters-and-transformers.md -->

## 1) Purpose

This document defines the adapter/translator/transformer components required to make:
- JSON and JSONL outputs immediately ingestible, and
- future CSV/MD/TXT outputs ingestible through deterministic translation,

before upserting into Zvec.

All paths must converge to `vector_record_v1` (see `zvec-integration-contract.md`).

---

## 2) Required Components

1. Source Adapter
   - Detects input artifact type (`jsonl`, `json`, `csv`, `md`, `txt`).
   - Streams or iterates records safely.

2. Record Translator
   - Converts source-specific shape into `vector_record_v1`.
   - Enforces required fields and stable `record_id`.

3. Text Transformer
   - Produces deterministic `text_for_embedding`.
   - Handles normalization and fallback rules.

4. Embedding Adapter
   - Calls configured embedding provider.
   - Returns fixed-dimension vectors matching Zvec collection schema.

5. Zvec Upsert Adapter
   - Maps `vector_record_v1` into `zvec.Doc`.
   - Executes batch `upsert` with per-record status capture.

6. Checkpoint/Replay Adapter
   - Tracks processed offsets or record IDs.
   - Supports resumable ingestion for large exports.

---

## 3) Format-Specific Translation Rules

## 3.1 JSONL (primary path)

Expected input:
- one canonical BlockData export JSON object per line.

Translation:
- 1 input line -> 1 `vector_record_v1`.

No chunking required unless explicitly enabled.

## 3.2 JSON

Expected input variants:
- array of canonical export objects, or
- object containing an items array.

Translation:
- flatten to logical records,
- each record follows the same mapping as JSONL.

## 3.3 CSV

Expected input:
- row-based tabular export.

Required mapping config:
- `id_columns`: columns that form stable `record_id`,
- `text_column` or `text_columns` + join rule,
- metadata column mapping.

Translation:
- each row -> `vector_record_v1`.

If `block_uid` is absent, translator must derive deterministic synthetic IDs and mark provenance accordingly.

## 3.4 Markdown (`.md`)

Expected input:
- plain markdown text.

Required preprocessing:
- deterministic segmenter (for example paragraph or heading+paragraph grouping).

Translation:
- each segment -> synthetic block-like record,
- assign deterministic segment IDs from content hash + ordinal.

## 3.5 Text (`.txt`)

Expected input:
- plain text.

Required preprocessing:
- deterministic segmentation policy (line groups, paragraph split, or token windows).

Translation:
- each segment -> `vector_record_v1` with synthetic IDs.

---

## 4) Zvec `Doc` Mapping Contract

Each `vector_record_v1` becomes one `zvec.Doc`:

- `Doc.id` <- `record_id`
- `Doc.fields` includes filterable metadata:
  - `run_id`, `conv_uid`, `block_uid`, `block_index`,
  - `schema_ref`, `schema_uid`,
  - `source_type`, `block_type`, `overlay_state`, `exported_at`
- `Doc.vectors["embedding"]` <- embedding output vector

Optional:
- include `text_for_embedding` in `fields` for explainability/debug.

---

## 5) Batch Strategy Contract

1. Read source in bounded batches.
2. Translate and validate each record.
3. Embed valid records.
4. Upsert to Zvec.
5. Persist checkpoint only after successful upsert commit.

Error policy:
- quarantine invalid records to a reject log with reason and source pointer.
- continue batch unless threshold exceeded.

---

## 6) Validation Gates

Gate A: Translation
- required fields present,
- `record_id` deterministic and unique within batch.

Gate B: Embedding
- vector length equals schema dimension,
- NaN/inf rejected.

Gate C: Upsert
- successful status for accepted records,
- failed IDs logged for replay.

Gate D: Queryability
- sample vector queries return documents,
- metadata filters return expected subsets.

---

## 7) Minimal Deliverables for First Operational Path

To make this operational quickly, implement in this order:

1. JSONL Source Adapter (canonical export path).
2. Record Translator for canonical two-key export.
3. Embedding Adapter (single configured provider).
4. Zvec Upsert Adapter.
5. Replay/checkpoint log.

Then extend to CSV/MD/TXT using the same `vector_record_v1` boundary.

<!-- END VERBATIM COPY -->

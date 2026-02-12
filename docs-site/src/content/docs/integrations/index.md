---
title: Integrations
description: Downstream pipelines, webhooks, and external consumers.
sidebar:
  label: Overview
  order: 0
---

Integrations consume exported outputs (typically JSONL assembled on demand) and should treat export contracts as the system boundary.

## North Star Flow

Documents from source integrations are decomposed into stable blocks, processed in parallel through user-defined schemas, then emitted either as reconstruction outputs or as downstream-ready artifacts (`json`, `jsonl`, `jsonb`, `csv`, `parquet`, `txt`, `md`) for KG, design, observability/trace, and vector pipelines.

## Canonical Integration Contracts

- [Canonical Export Contract](/docs/architecture/canonical-export/)
- [Zvec Integration Contract](/docs/integrations/zvec-contract/)
- [Zvec Adapters and Transformers](/docs/integrations/zvec-adapters-and-transformers/)

## Integration Categories (End-to-End)

1. Contract layer
   - Canonical output shape and invariants (`immutable` + `user_defined`)
   - Integration-specific ingestion contracts (example: Zvec)
2. Adapter layer
   - Source adapters by artifact type (`jsonl`, `json`, `csv`, `md`, `txt`)
   - Translators to canonical intermediate records
3. Processing layer
   - Text selection and normalization for embedding/search
   - Embedding adapter and vector DB write adapter
4. Consumption layer
   - Retrieval services, downstream APIs, analytics/search products
5. Operations layer
   - Replay/checkpointing, reject logs, reindex strategy, versioned collections

## Current Repo (Living Research)

- `docs/integrations/compass_artifact_wf-59facff0-a414-4b99-8c9c-24b04039d562_text_markdown.md` (idea catalog; not canonical contract text)

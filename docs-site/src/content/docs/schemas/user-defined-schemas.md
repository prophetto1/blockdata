---
title: User-Defined Schemas
description: Creating and applying custom extraction schemas.
sidebar:
  order: 2
---

**Spec version:** v0.2  
**Date:** 2026-02-12  
**Sources:** `docs/product-defining-v2.0/0207-prd-tech-spec-doc2.md`, `supabase/functions/schemas/index.ts`, `docs/tests/user-defined/prose-optimizer-v1.schema.json`  
**Status:** Canonical — schema storage + identifiers are implemented; authoring UX is documented separately

---

## Scope

This page defines what a **user-defined schema** is in BlockData, what stable identifiers it has (`schema_ref`, `schema_uid`), and how schema artifacts relate to runs and per-block overlays.

It does **not** specify the schema authoring UI (wizard/templates/advanced editor) or any assistant-driven schema generation.

---

## Concepts (in one paragraph)

A schema is a user-owned JSON artifact that describes the expected shape of per-block outputs. A run binds one schema to one converted document (`conv_uid`) for one execution instance. The worker produces one overlay payload per `(run_id, block_uid)`, and the grid/export layer reads those overlays as the run’s user-defined output.

## Identifiers

Schemas have two stable identifiers:

- `schema_ref` is a user-facing slug. It is unique per owner and is used for human selection and display.
- `schema_uid` is a deterministic content hash of the schema JSON. Identical schema JSON produces the same `schema_uid` regardless of key ordering.

## Schema artifact format

At the storage boundary, schema artifacts are treated as **opaque JSON**. The platform stores the full JSON object and computes `schema_uid` from a deterministic serialization of that JSON.

In practice, many schema artifacts follow JSON Schema conventions (for example: `type: "object"` plus a `properties` map), because downstream UI and worker prompts often use `properties` keys as the field/column set. The repo includes an example schema artifact at `docs/tests/user-defined/prose-optimizer-v1.schema.json`.

## Save boundary (`POST /schemas`)

Saving a schema is a single boundary:

- On first insert, the server writes `schema_ref`, `schema_uid`, and `schema_jsonb`.
- If the same user re-saves the same `schema_ref` with identical content (same `schema_uid`), the server treats it as idempotent and returns the existing row.
- If the same user re-saves the same `schema_ref` with different content, the server returns a conflict so the user can rename/fork.

---

<!-- BEGIN VERBATIM COPY from docs/product-defining-v2.0/0207-prd-tech-spec-doc2.md (selected excerpts) -->

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

#### `schema_uid`

- `schema_uid = sha256(canonical_json_bytes(schema_artifact))`
- `canonical_json_bytes` means deterministic JSON serialization: sorted keys, no trailing whitespace, consistent numeric formatting, UTF-8 encoded.
- Two schema artifacts with identical content produce the same `schema_uid` regardless of key ordering in the original upload.

<!-- END VERBATIM COPY -->

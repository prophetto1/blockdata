---
title: User-Defined Schemas
description: Creating and applying custom extraction schemas.
sidebar:
  order: 2
---

**Spec version:** v1.0  
**Date:** 2026-02-14  
**Sources:** `docs/specs/user-schema-json-contract.md`, `docs/product-defining-v2.0/0207-prd-tech-spec-doc2.md`, `supabase/functions/schemas/index.ts`, `docs/tests/user-defined/prose-optimizer-v1.schema.json`  
**Status:** Canonical - schema storage + identifiers are implemented; authoring UX is documented separately

---

## Scope

This page defines what a **user-defined schema** is in BlockData, what stable identifiers it has (`schema_ref`, `schema_uid`), how schema artifacts relate to runs and per-block overlays, and the canonical structured schema object contract.

It does **not** specify detailed schema authoring UI behavior (wizard/templates/advanced editor) or assistant-generated schema features.

This page is specifically about **User Schema JSON**. **Source Document JSONs** are ingestion data records and are a separate concern.

---

## Concepts (in one paragraph)

A schema is a user-owned JSON artifact (User Schema JSON) that describes the expected shape of per-block outputs. A run binds one schema to one converted document (`conv_uid`) for one execution instance. The worker produces one overlay payload per `(run_id, block_uid)`, and the grid/export layer reads those overlays as the run's user-defined output.

## Important Distinction

- **User Schema JSON**: structured schema object used to define extraction fields.
- **Source Document JSONs**: database/API-style data records used for document/source integration.

Do not treat these as interchangeable inputs.

## Identifiers

Schemas have two stable identifiers:

- `schema_ref` is a user-facing slug. It is unique per owner and is used for human selection and display.
- `schema_uid` is a deterministic content hash of the User Schema JSON artifact. Identical User Schema JSON produces the same `schema_uid` regardless of key ordering.

## Schema Artifact Format

At the storage boundary, the platform stores the full User Schema JSON artifact and computes `schema_uid` from deterministic serialization.

For operational correctness in the current product workflow, user schemas should follow the **structured schema object** contract.

## Structured Schema Object Contract

User schema uploads are not arbitrary JSON. They should follow a structured schema object shape so:

- field extraction is deterministic,
- grid columns map cleanly to schema fields,
- worker prompts and exports remain stable.

### Required shape

At minimum:

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "field_name": {
      "type": "string"
    }
  }
}
```

Common optional keys:

- `required` (array of field keys)
- `description`
- `prompt_config`
  - `system_instructions`
  - `per_block_prompt`
  - `model`
  - `temperature`
  - `max_tokens_per_block`

### Database-style mental model

Think of User Schema JSON like a table definition:

- `properties` keys are columns,
- each property object is column metadata,
- per-block overlay JSON is data that fills those columns.

### Nested fields

Nested/object fields may be present in advanced JSON, but current grid behavior is top-level first:

- columns are derived from top-level `properties`,
- nested fields are not expanded into `parent.child` columns,
- nested values render in one parent field cell.

For operational simplicity, prefer flat top-level fields.

### Recommended example

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "rhetorical_function": { "type": "string" },
    "cited_authority": { "type": "string" },
    "confidence": { "type": "number" }
  },
  "required": ["rhetorical_function"],
  "prompt_config": {
    "system_instructions": "Extract structured legal signals from each block.",
    "per_block_prompt": "Return JSON only for the declared properties."
  }
}
```

## Save Boundary (`POST /schemas`)

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

---
title: Schemas
description: Schemas are global extraction templates that define what the AI worker should extract from each block.
sidebar:
  order: 4
---

A **schema** is a user-defined extraction template. It tells the AI worker what structured data to produce for each block. Schemas are global — they belong to the user, not to any specific project, and can be reused across documents and projects.

## Schema structure

A schema is stored as an opaque JSON artifact with two key sections:

```json
{
  "schema_ref": "scotus_close_reading_v1",
  "properties": {
    "rhetorical_function": {
      "type": "string",
      "enum": ["holding", "dicta", "reasoning", "procedural"]
    },
    "cited_authorities": {
      "type": "array",
      "items": { "type": "string" }
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    }
  },
  "prompt_config": {
    "system_instructions": "You are analyzing US Supreme Court opinions...",
    "per_block_prompt": "For the following paragraph, extract...",
    "model": "claude-sonnet-4-5-20250929",
    "temperature": 0.2,
    "max_tokens_per_block": 2000,
    "max_batch_size": 15
  }
}
```

### `properties`

Defines the extraction fields. Each key becomes a column in the block viewer grid and a field in the exported `user_defined.data` object. Supported types: `string`, `number`, `boolean`, `array`, `object`. Fields can have `enum` constraints.

### `prompt_config`

Controls how the AI worker processes blocks:

| Key | Purpose |
|-----|---------|
| `system_instructions` | System prompt sent to the AI model |
| `per_block_prompt` | Per-block instruction template |
| `model` | Explicit model selection (overrides user defaults) |
| `temperature` | Model temperature (0.0 - 1.0) |
| `max_tokens_per_block` | Output token limit per block |
| `max_batch_size` | Optional cap on blocks per API call |

## Opaque JSON principle

The platform validates only two things about a schema artifact:

1. It is valid JSON
2. It has a `schema_ref` key (string)

Everything else — field definitions, instructions, reference material, enum values — is user-controlled. Users can include anything: a style guide as `reference_material`, a signal taxonomy, a defined terms list from a contract, or nothing beyond `schema_ref` and a few field names.

## Three schema tracks

Schemas naturally fall into three tracks based on how the user designs their fields:

| Track | What the AI produces | Example fields |
|-------|---------------------|----------------|
| **Metadata enrichment** | Structured metadata *about* the source content | `rhetorical_function`, `cited_authorities`, `confidence` |
| **Content revision** | A revised version of the source content | `revised_content`, `revision_type`, `changes_made` |
| **Combined** | Both revision and metadata | `revised_content`, `reading_level`, `rhetorical_function` |

The platform doesn't distinguish between tracks — the schema design determines which fields exist and how they're used.

## Schema identity

- `schema_ref` — User-facing slug (e.g., `"contract_clause_review_v1"`)
- `schema_uid = sha256(canonical_json_bytes(schema_artifact))` — Content hash for idempotent uploads. Two identical schemas produce the same `schema_uid`.

## Data model

| Field | Type | Description |
|-------|------|-------------|
| `schema_id` | UUID | Primary key |
| `owner_id` | UUID | FK to `auth.users` |
| `schema_ref` | text | User-facing identifier |
| `schema_uid` | text | Content hash |
| `schema_jsonb` | jsonb | The full schema artifact |
| `created_at` | timestamptz | Creation timestamp |

# User Schema JSON Contract

Status: Canonical reference for User Schema JSON upload shape and terminology.

## Core Distinction

There are two different JSON inputs in this system:

1. User Schema JSON (structured schema object users upload to define extraction fields)
2. Source Document JSONs (database/API-style data records users upload for document/source integration)

Do not treat these as interchangeable.

This document defines the `User Schema JSON` contract.

## What "Structured Schema Object" Means

User schema uploads must be a structured schema object, not arbitrary JSON.

Required top-level shape:

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
- `prompt_config` (`system_instructions`, `per_block_prompt`, `model`, `temperature`, `max_tokens_per_block`)

## Database-Like Mental Model

Use a database schema mental model:

- `properties` keys are columns
- each property definition is column metadata
- overlays/export rows are data records for those columns

This is the intended shape for reliable schema creation and ingestion.

## Nested Fields

Nested/object fields may exist in advanced JSON, but current grid behavior is top-level-column first:

- grid columns are derived from top-level `properties`
- nested objects are not expanded into separate `parent.child` columns
- nested values render inside a single parent field cell

For predictable table workflows, prefer flat top-level fields.

## Example: Recommended Flat Schema

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

## Operational Rule

When documenting, validating, or building schema UX:

- say "User Schema JSON" when you mean schema definitions
- say "Source Document JSONs" when you mean ingestion data records
- keep the "structured schema object" phrase as the required shape for User Schema JSON
- reference this file
- avoid language implying generic JSON of any shape is equally valid

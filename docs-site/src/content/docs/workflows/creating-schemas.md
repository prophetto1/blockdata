---
title: Creating Schemas
description: How to define extraction schemas — the instructions that tell the AI worker what to produce for each block.
sidebar:
  order: 2
---

## What a schema does

A schema defines what structured data the AI worker should extract (or produce) for each block. The schema's `properties` become columns in the block viewer grid and fields in the exported `user_defined.data` object.

## Current schema creation path

Currently, schemas are created by uploading a JSON file on the **Schemas** page (`/app/schemas`). Future releases will add a visual wizard and AI-assisted schema design.

### Minimal schema

```json
{
  "schema_ref": "my_schema_v1",
  "properties": {
    "summary": { "type": "string" },
    "category": { "type": "string", "enum": ["intro", "analysis", "conclusion"] }
  },
  "prompt_config": {
    "system_instructions": "You are analyzing document blocks.",
    "per_block_prompt": "For the following block, provide a summary and classify its category."
  }
}
```

### Required fields

Only `schema_ref` (a string identifier) is strictly required by the platform. Everything else is for the AI worker's benefit.

## Schema design patterns

### Metadata enrichment

Extract structured data *about* the content without modifying it:

```json
{
  "schema_ref": "legal_analysis_v1",
  "properties": {
    "rhetorical_function": {
      "type": "string",
      "enum": ["holding", "dicta", "reasoning", "procedural"]
    },
    "cited_authorities": {
      "type": "array",
      "items": { "type": "string" }
    },
    "confidence": { "type": "number" }
  },
  "prompt_config": {
    "system_instructions": "You are a legal analyst...",
    "per_block_prompt": "Classify this paragraph and extract citations."
  }
}
```

### Content revision

Produce a revised version of the block content:

```json
{
  "schema_ref": "prose_edit_v1",
  "properties": {
    "revised_content": { "type": "string" },
    "changes_made": { "type": "array", "items": { "type": "string" } }
  },
  "prompt_config": {
    "system_instructions": "Apply Strunk's 18 rules to improve clarity...",
    "per_block_prompt": "Revise this paragraph and list what you changed."
  }
}
```

### Combined (revision + enrichment)

Both revise and annotate:

```json
{
  "schema_ref": "compliance_rewrite_v1",
  "properties": {
    "revised_content": { "type": "string" },
    "original_reading_level": { "type": "string" },
    "revised_reading_level": { "type": "string" },
    "simplification_notes": { "type": "string" }
  },
  "prompt_config": {
    "system_instructions": "Rewrite for 6th-grade reading level...",
    "per_block_prompt": "Simplify this block and report the changes."
  }
}
```

## Prompt configuration options

| Key | Type | Purpose |
|-----|------|---------|
| `system_instructions` | string | System prompt for the AI model |
| `per_block_prompt` | string | Instruction template sent with each block |
| `model` | string | Override the default AI model |
| `temperature` | number | 0.0 - 1.0 |
| `max_tokens_per_block` | number | Output limit per block |
| `max_batch_size` | number | Cap on blocks per API call (default: auto-calculated) |

## Tips

- **Start simple.** Begin with 2-3 fields, run on a small document, inspect results, then iterate.
- **Use enums.** Constrained fields (`enum` arrays) produce more consistent output.
- **Include reference material.** The `system_instructions` can embed a style guide, taxonomy, or defined terms list — the full schema is sent to the AI.
- **Batch size.** Schemas with `revised_content` fields automatically get smaller batches (more output per block). You don't need to tune this manually.

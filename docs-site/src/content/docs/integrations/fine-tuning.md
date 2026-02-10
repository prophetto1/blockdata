---
title: Fine-Tuning Datasets
description: How to use confirmed overlays as supervised training examples for model fine-tuning.
sidebar:
  order: 1
---

## The pattern

Confirmed overlays are supervised training examples: **input** (block content) → **output** (structured extraction per schema). The staging/confirm flow is the quality gate — every training example has been human-reviewed.

## Building training data

1. Design a schema for the extraction task you want to fine-tune
2. Upload representative documents and process them
3. Review and confirm overlays in the block viewer (this is your labeling step)
4. Export as JSONL

Each exported record contains:
- `immutable.block.block_content` — the input
- `user_defined.data` — the expected output

## Format conversion

Export JSONL records can be reshaped into the format your fine-tuning provider expects:

**Anthropic format:**
```json
{
  "messages": [
    { "role": "user", "content": "{block_content}" },
    { "role": "assistant", "content": "{JSON.stringify(user_defined.data)}" }
  ]
}
```

**OpenAI format:**
```json
{
  "messages": [
    { "role": "system", "content": "{schema system_instructions}" },
    { "role": "user", "content": "{block_content}" },
    { "role": "assistant", "content": "{JSON.stringify(user_defined.data)}" }
  ]
}
```

## Provenance

The immutable envelope means every training example traces to:
- A specific source document (`source_uid`)
- A specific block in that document (`block_uid`)
- The parsing method used (`conv_parsing_tool`)
- Who confirmed it and when (`confirmed_by`, `confirmed_at`)

This matters for dataset auditing, bias detection, and reproducibility.

## Revision track

For content revision schemas, fine-tuning data captures the transformation itself: source content → revised content, paired with revision metadata. This trains models to perform the same kind of revision autonomously.

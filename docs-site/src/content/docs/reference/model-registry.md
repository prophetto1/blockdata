---
title: Model Registry
description: AI model specifications, context windows, output limits, and the model selection fallback chain.
sidebar:
  order: 4
---

## Available models

| Model ID | Context Window | Max Output Tokens |
|----------|:-:|:-:|
| `claude-sonnet-4-5-20250929` | 200,000 | 16,384 |
| `claude-haiku-4-5-20251001` | 200,000 | 8,192 |
| `claude-opus-4-6` | 200,000 | 32,768 |

## Model selection fallback chain

When processing blocks, the model is selected using this priority order:

1. **Schema override** — `prompt_config.model` in the schema artifact
2. **Run override** — `model_config.model` set at run creation
3. **User defaults** — Configured on the Settings page (`/app/settings`)
4. **Environment default** — `WORKER_DEFAULT_MODEL` (defaults to `claude-sonnet-4-5-20250929`)

## Settings page configuration

The Settings page (`/app/settings`) allows users to:

- **API key** — Enter and test an Anthropic API key (`sk-ant-...`)
- **Default model** — Select from Claude Opus 4.6, Sonnet 4.5, or Haiku 4.5
- **Default temperature** — 0.0 to 1.0 (default: 0.3)
- **Default max tokens per block** — 100 to 8,000 (default: 2,000)

## Pack size impact

Model specs affect batch processing. The `calculatePackSize()` function uses:

- `contextWindow` — Total token budget for input + output
- `maxOutput` — Maximum output tokens per API call

Larger context windows and output limits allow more blocks per pack. See [Worker Protocol](/docs/architecture/worker-protocol/) for the full calculation.

## Constants

| Parameter | Source | Default |
|-----------|--------|---------|
| `WORKER_DEFAULT_MODEL` | Environment variable | `claude-sonnet-4-5-20250929` |
| `WORKER_MAX_RETRIES` | Environment variable | `3` |
| `MAX_PACK_CAP` | Constant | `20` |
| `CHARS_PER_TOKEN` | Constant | `4` (conservative for English) |

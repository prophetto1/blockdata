---
title: Worker Protocol
description: The batched worker protocol — pre-computed packs, JSON array communication, prompt caching, and partial failure handling.
sidebar:
  order: 2
---

The worker replaces per-block API calls with **pre-computed batch packing**. At run creation, the orchestrator calculates optimal blocks per API call. The courier claims a pack, sends it as a single API call, and writes results back.

## Three layers

| Layer | What | Responsibility |
|-------|------|---------------|
| **Orchestrator** | Run creation logic | Computes pack assignments for every block before any API calls |
| **Courier** | `worker/index.ts` Edge Function | Claims a pre-assigned pack, formats the API call, writes results |
| **AI model** | Claude / GPT / Gemini | Receives N blocks as JSON array, returns N results |

## Communication protocol

**Courier sends (user message):**
```json
[
  { "block_uid": "abc123:0", "block_index": 0, "block_type": "paragraph", "block_content": "..." },
  { "block_uid": "abc123:1", "block_index": 1, "block_type": "heading", "block_content": "..." }
]
```

**AI model returns (structured output):**
```json
[
  { "block_uid": "abc123:0", "data": { "rhetorical_function": "holding", ... } },
  { "block_uid": "abc123:1", "data": { "rhetorical_function": "structural", ... } }
]
```

## Pack size calculation

Runs once at run creation. Uses data already available in the database.

```
function calculatePackSize(model, systemPromptChars, perBlockPromptChars,
    avgBlockContentChars, schemaFieldCount, schemaHasRevisedContent, schemaMaxBatchSize):

  systemTokens = systemPromptChars / 4
  perBlockInputTokens = (perBlockPromptChars + avgBlockContentChars + 100) / 4
  inputBudget = contextWindow - maxOutput - systemTokens - 2000

  perBlockOutputTokens = schemaHasRevisedContent
    ? (avgBlockContentChars / 4) + (schemaFieldCount * 30)
    : schemaFieldCount * 40
  outputBudget = maxOutput - 2000

  calculated = min(inputBudget / perBlockInputTokens, outputBudget / perBlockOutputTokens)
  packSize = min(calculated, MAX_PACK_CAP)  // MAX_PACK_CAP = 20
  if schemaMaxBatchSize: packSize = min(packSize, schemaMaxBatchSize)

  return max(packSize, 1)  // never less than 1
```

Key inputs: model context window, system prompt length, block content length, schema field count, whether schema has `revised_content`.

Schemas with `revised_content` naturally get smaller packs (output per block is larger).

## Prompt structure

```
System message:
  {system_instructions from prompt_config}
  Schema fields: {JSON.stringify(schema.properties)}

User message:
  {per_block_prompt from prompt_config}
  Process each block and return a JSON array of results.
  Input blocks: {JSON.stringify(blockArray)}
```

Structured output is enforced via `tool_use` with a JSON schema matching the extraction fields.

## Prompt caching

The system message (instructions + schema) is identical across all packs in a run. With Anthropic's prompt caching:

- Mark system message with `cache_control: { type: "ephemeral" }` on the first pack
- Subsequent packs (within ~5 min TTL) hit cache: **~90% cheaper** for system prompt tokens
- Batching reduces call count; caching reduces cost per call

**Combined effect (500-block document, 20-block packs):**
- Before: 500 API calls, each paying full price
- After: 25 API calls, first pays full price, 24 get cached system prompt

## Response validation

The courier validates after each response:

1. **Completeness** — Every input `block_uid` appears in the output
2. **No extras** — No unexpected `block_uid` values
3. **Schema conformance** — Each `data` object has expected keys (best-effort)

## Failure handling

| Scenario | Action |
|----------|--------|
| API call fails entirely | All blocks in pack → `pending` for retry |
| Response missing some blocks | Present ones → `ai_complete`; missing → `pending` |
| Malformed data for a block | That block → `failed` (or `pending` if under retry limit) |
| Max retries exceeded | Block → `failed`, `last_error` populated |

## Database changes

A `pack_index` column on `block_overlays_v2` stores the pre-computed pack assignment:

```sql
ALTER TABLE block_overlays_v2 ADD COLUMN pack_index INTEGER;
CREATE INDEX idx_block_overlays_v2_pack
  ON block_overlays_v2(run_id, pack_index) WHERE status = 'pending';
```

The courier claims via `claim_overlay_pack(run_id, worker_id)` — atomic claim of all blocks in the next unclaimed pack using `FOR UPDATE SKIP LOCKED`.

## Backward compatibility

- Existing overlays with `pack_index = NULL` use the legacy 1:1 path
- No frontend changes — the grid reads overlays identically
- No schema changes — existing schemas without `max_batch_size` auto-calculate
- Fallback to `pack_size=1` produces single-block packs (functionally identical to 1:1)

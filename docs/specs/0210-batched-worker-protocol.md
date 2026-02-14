# Batched Worker Protocol: JSON Array Communication

**Platform:** BlockData
**Date:** 2026-02-10
**Scope:** Replacing per-block API calls with auto-sized batch processing via JSON array communication between platform and LLM
**Status:** Proposed — requires review before implementation

---

## Definitions

| Term | Meaning |
|---|---|
| **Run** | A job that sends a document's blocks to an AI model for processing according to a schema's instructions. When a user selects a document and a schema and clicks "apply," the system creates a run. This generates one overlay row per block, all initially `pending`, and begins dispatching blocks (in packs) to the AI model. The AI model reads each block, follows the schema's `prompt_config` instructions, and produces structured output for that block. The run tracks aggregate progress (`completed_blocks`, `failed_blocks`, `status`) and is identified by `run_id` in `runs_v2`. |
| **Pack** | A pre-computed group of blocks within a run that will be sent to the AI model in a single API call. Pack size is determined at run creation based on block sizes, schema properties, and model limits. A pack is identified by `pack_index` (integer, 0-based) within a run. |
| **Overlay** | The structured data the AI model produces for a single block. Stored in `block_overlays_v2` — first in `overlay_jsonb_staging` (awaiting human review), then in `overlay_jsonb_confirmed` (after user approval). Each overlay row belongs to exactly one run and one block. |
| **Schema** | A user-uploaded User Schema JSON artifact (structured schema object) defining extraction fields under top-level `properties`, plus `prompt_config` instructions. Stored in `schemas`. Reusable across runs and documents. Contract: `docs/specs/user-schema-json-contract.md`. |

---

## Three Layers

This spec uses distinct names for three layers that participate in block processing. None does the job of another.

| Layer | What it is | Responsibility |
|---|---|---|
| **Orchestrator** | Run creation logic (edge function or RPC triggered at "start run") | Knows all sizes in advance. Computes pack assignments for every block in the run. Writes pre-packed work units to the queue. |
| **Courier** | `supabase/functions/worker/index.ts` — stateless Deno edge function | Claims a pre-packed work unit. Formats the API call. Sends it. Writes results back. Does not decide what goes in a pack. |
| **AI model** | Claude, GPT, Gemini — whatever LLM receives the prompt | Receives instructions + N blocks as a JSON array. Processes each block. Returns N filled results as a JSON array. Does not know or decide N. |

---

## Problem

The current courier makes **one API call per block**. For a 500-block document, that means 500 independent HTTP round-trips, each re-transmitting the identical system prompt, schema definition, and per-block prompt template.

This is:
- **Slow** — sequential latency adds up; each call has ~1-2s overhead beyond token generation
- **Expensive** — the system prompt and schema (often 1-2K tokens) are billed as input tokens on every call
- **Unnecessary** — the platform already knows block sizes, schema sizes, and model context windows before the run starts

---

## Proposal

Replace the 1:1 block-to-API-call pattern with **pre-computed batch packing**. At run creation, the orchestrator calculates the optimal number of blocks per API call and writes pack assignments to the queue. The courier claims a pack, formats a single API call containing all blocks in that pack, and writes results back. The AI model receives a JSON array of N blocks and returns a JSON array of N results.

### Communication Protocol

**Courier sends to AI model (inside the user message):**
```json
[
  {
    "block_uid": "abc123:0",
    "block_index": 0,
    "block_type": "paragraph",
    "block_content": "The court held that the statute was unconstitutional..."
  },
  {
    "block_uid": "abc123:1",
    "block_index": 1,
    "block_type": "heading",
    "block_content": "II. Analysis"
  },
  {
    "block_uid": "abc123:2",
    "block_index": 2,
    "block_type": "paragraph",
    "block_content": "Furthermore, the precedent established in..."
  }
]
```

**AI model returns (structured output):**
```json
[
  {
    "block_uid": "abc123:0",
    "data": {
      "rhetorical_function": "holding",
      "cited_authorities": ["Marbury v. Madison"],
      "confidence": 0.92
    }
  },
  {
    "block_uid": "abc123:1",
    "data": {
      "rhetorical_function": "structural",
      "cited_authorities": [],
      "confidence": 0.99
    }
  },
  {
    "block_uid": "abc123:2",
    "data": {
      "rhetorical_function": "reasoning",
      "cited_authorities": ["Chevron v. NRDC"],
      "confidence": 0.87
    }
  }
]
```

The `data` object conforms to the user-defined schema's `properties`. The `block_uid` key enables the courier to match results back to overlay rows. The AI model processes every block in the array it receives — it does not decide how many blocks to process.

---

## What the System Already Knows

All inputs required for pack size calculation are available at run creation time — before any API call is made:

| Data Point | Source | Available When |
|---|---|---|
| Block content lengths | `blocks_v2.block_content` | After ingest |
| Total block count | `runs_v2.total_blocks` | At run creation |
| Schema field count and types | `schemas.schema_jsonb.properties` | At schema upload |
| System instructions length | `schemas.schema_jsonb.prompt_config.system_instructions` | At schema upload |
| Per-block prompt template length | `schemas.schema_jsonb.prompt_config.per_block_prompt` | At schema upload |
| Model context window | Model registry constant | Always known |
| Model max output tokens | Model registry constant | Always known |

---

## Pack Size Calculation (Orchestrator)

This logic runs once at run creation, not on every courier invocation. It produces a pack assignment for every block in the run.

```
MODEL_REGISTRY = {
  "claude-sonnet-4-5-20250929": { contextWindow: 200_000, maxOutput: 16_384 },
  "claude-haiku-4-5-20251001":  { contextWindow: 200_000, maxOutput: 8_192 },
  "claude-opus-4-6":            { contextWindow: 200_000, maxOutput: 32_768 },
}

CHARS_PER_TOKEN = 4  // conservative estimate for English text
MAX_PACK_CAP = 20    // quality guard — model attention degrades on long repetitive tasks

function calculatePackSize(
  model: string,
  systemPromptChars: number,
  perBlockPromptChars: number,
  avgBlockContentChars: number,
  schemaFieldCount: number,
  schemaHasRevisedContent: boolean,
  schemaMaxBatchSize: number | null,    // optional override from prompt_config
): number {
  const { contextWindow, maxOutput } = MODEL_REGISTRY[model]
  const safetyMargin = 2_000  // tokens reserved for framing, JSON structure

  // Input budget: system prompt + N * (per_block_prompt + block_content + JSON overhead)
  const systemTokens = systemPromptChars / CHARS_PER_TOKEN
  const perBlockInputTokens = (perBlockPromptChars + avgBlockContentChars + 100) / CHARS_PER_TOKEN
  const inputBudget = contextWindow - maxOutput - systemTokens - safetyMargin

  // Output budget: N * (estimated output per block)
  // Metadata-only fields: ~40 tokens each.
  // Schemas with revised_content: output ≈ input length + metadata fields.
  // The calculation naturally produces smaller packs for revision-heavy schemas.
  const perBlockOutputTokens = schemaHasRevisedContent
    ? (avgBlockContentChars / CHARS_PER_TOKEN) + (schemaFieldCount * 30)
    : schemaFieldCount * 40
  const outputBudget = maxOutput - safetyMargin

  // Pack size is the minimum of input-constrained and output-constrained
  const inputConstrained = Math.floor(inputBudget / perBlockInputTokens)
  const outputConstrained = Math.floor(outputBudget / perBlockOutputTokens)
  const calculated = Math.min(inputConstrained, outputConstrained)

  // Apply caps: quality guard, then optional schema override (use the lower)
  let packSize = Math.min(calculated, MAX_PACK_CAP)
  if (schemaMaxBatchSize != null) {
    packSize = Math.min(packSize, schemaMaxBatchSize)
  }

  return Math.max(packSize, 1)  // never less than 1
}
```

**How packs are assigned:** The orchestrator queries all block content lengths for the run's `conv_uid`, computes `avgBlockContentChars`, calls `calculatePackSize()` once, then assigns blocks to packs in order of `block_index`. Each pack gets a `pack_index` (0, 1, 2, ...). The assignment is written to the overlay rows or a separate work queue table — the courier claims an entire pack, not individual blocks.

**Why not per-block sizing?** Using the average is simpler and sufficient. A document with wildly varying block sizes (one 10-char heading, one 5000-char paragraph) will still fit — the safety margin and conservative token estimate absorb the variance. If a specific pack exceeds limits at API call time, the courier treats the API error as a retriable failure.

---

## What Changes

### Current Flow (1:1)

```
Run creation:
  create overlay rows (one per block, status=pending)

Courier invocation:
  claim_overlay_batch(run_id, 25) → 25 block_uids
  for each block_uid:
      load block_content
      call Anthropic API (1 block)      ← 1 API call
      write overlay_jsonb_staging       ← 1 DB write
  update run rollup
```

25 blocks = 25 API calls.

### Proposed Flow (pre-packed)

```
Run creation (orchestrator):
  calculate pack_size from known data (e.g., 10)
  create overlay rows with pack_index assigned
    blocks 0-9  → pack 0
    blocks 10-19 → pack 1
    blocks 20-24 → pack 2

Courier invocation:
  claim next unclaimed pack → get all block_uids in that pack
  load all block_content for the pack
  build JSON array of blocks
  call Anthropic API (N blocks)         ← 1 API call for N blocks
  validate response array
  for each result in response:
      match by block_uid
      write overlay_jsonb_staging       ← 1 DB write per block
  handle missing/malformed results
  update run rollup
```

25 blocks = 3 API calls (down from 25). The courier doesn't decide the packing — it receives a pre-assigned pack and executes it.

### Prompt Structure

```
System message:
  {system_instructions from prompt_config}

  You are processing blocks from a document. For each block in the input array,
  produce a result object with the block_uid and a data object containing the
  schema fields.

  Schema fields:
  {JSON.stringify(schema.properties, null, 2)}

User message:
  {per_block_prompt from prompt_config}

  Process each block below and return a JSON array of results.
  Each result must have: { "block_uid": "...", "data": { ...schema fields... } }

  Input blocks:
  {JSON.stringify(blockArray)}
```

### Structured Output

Two options for ensuring valid JSON output:

**Option A: `tool_use` with array schema** (recommended initially)
```json
{
  "name": "submit_results",
  "input_schema": {
    "type": "object",
    "properties": {
      "results": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "block_uid": { "type": "string" },
            "data": {
              "type": "object",
              "properties": { ...schema.properties }
            }
          },
          "required": ["block_uid", "data"]
        }
      }
    },
    "required": ["results"]
  }
}
```

This preserves the `tool_use` pattern that forces the model to produce schema-conformant output, while batching multiple blocks per call. Note: `tool_use` is Anthropic/OpenAI-specific.

**Option B: Raw JSON response (model-agnostic)**

Instruct the model to return a raw JSON array. Simpler prompt, works with any model that follows instructions. Requires post-hoc validation by the courier. This is the natural evolution once the protocol is proven stable — it removes the dependency on vendor-specific structured output features.

### Response Validation (Courier)

After receiving the response, the courier validates:

1. **Completeness** — every `block_uid` from the input pack appears in the output
2. **No extras** — no `block_uid` values that weren't in the input
3. **Schema conformance** — each `data` object has the expected keys (type checking is best-effort; the staging layer and human review catch deeper issues)

**On partial failure:**
- If the entire API call fails (network error, 500, malformed response), all blocks in that pack return to `pending` for retry
- If the response is valid but missing some `block_uid` entries, the present ones are written as `ai_complete` and the missing ones return to `pending`
- If a `data` object is empty or clearly malformed for a specific block, that block is marked `failed` (or returned to `pending` if under retry limit)

---

## Prompt Caching Integration

Anthropic's prompt caching (`cache_control: { type: "ephemeral" }`) complements batching:

- The system message (instructions + schema definition) is identical across all packs in a run
- Mark the system message with `cache_control` on the first pack
- Subsequent packs in the same run (~5 minute TTL) hit the cache: **~90% cheaper** for the system prompt tokens
- Batching reduces the *number* of calls; caching reduces the *cost per call*

Combined effect for a 500-block document with 20-block packs:
- **Before:** 500 API calls, each paying full price for system prompt
- **After:** 25 API calls, first one pays full price, remaining 24 get cached system prompt

---

## Configuration

### Schema-Level (optional overrides in `prompt_config`)

```json
{
  "prompt_config": {
    "system_instructions": "...",
    "per_block_prompt": "...",
    "model": "claude-sonnet-4-5-20250929",
    "temperature": 0.2,
    "max_tokens_per_block": 2000,
    "max_batch_size": 15
  }
}
```

`max_batch_size` is optional. If omitted, the orchestrator calculates from the model context window and schema properties. If provided, the orchestrator uses the lower of the calculated value and the override. Schemas with large output fields (e.g., `revised_content`) naturally produce smaller packs — no manual classification needed.

### Environment / Constants

| Parameter | Source | Default | Used By |
|---|---|---|---|
| `WORKER_DEFAULT_MODEL` | Env var | `claude-sonnet-4-5-20250929` | Orchestrator |
| `WORKER_MAX_RETRIES` | Env var | `3` | Courier |
| `MAX_PACK_CAP` | Constant | `20` | Orchestrator |

---

## Database Changes

### Option A: `pack_index` column on `block_overlays_v2`

Add a nullable integer column `pack_index` to `block_overlays_v2`. The orchestrator sets it at run creation. The courier claims by `pack_index` instead of arbitrary batch:

```sql
ALTER TABLE block_overlays_v2 ADD COLUMN pack_index INTEGER;
CREATE INDEX idx_block_overlays_v2_pack ON block_overlays_v2(run_id, pack_index)
  WHERE status = 'pending';
```

New claim RPC: `claim_overlay_pack(run_id, worker_id)` — claims all blocks in the next unclaimed pack (lowest `pack_index` where all blocks are `pending`).

### Option B: Separate work queue table

Create a `work_packs` table that stores pre-computed pack assignments. The courier claims from this table. The overlay table is unchanged. More complex but cleaner separation.

**Recommendation:** Option A is simpler. One column, one index, one new RPC. The pack assignment is an attribute of the overlay, not a separate entity.

---

## Backward Compatibility

- **Minimal database change.** One nullable column + one index + one new claim RPC. Existing overlay rows with `pack_index = NULL` are processed by the current 1:1 courier — no migration of existing data needed.
- **No frontend changes.** The grid reads `overlay_jsonb_staging` and `overlay_jsonb_confirmed` exactly as before. It doesn't know or care whether the overlay was produced by a single-block or batched call.
- **No schema changes.** Existing schemas without `max_batch_size` work automatically — the orchestrator calculates from model limits and schema properties.
- **Fallback to pack_size=1.** If `calculatePackSize` returns 1 (very large blocks, very small context window), every block gets its own pack. The courier sends a single-block JSON array — functionally identical to the current 1:1 flow.

---

## Implementation Checklist

### Orchestrator (run creation)
- [ ] Add `MODEL_REGISTRY` constant
- [ ] Add `calculatePackSize()` function
- [ ] Compute pack assignments at run creation and write `pack_index` to overlay rows
- [ ] Add `max_batch_size` to `prompt_config` convention (optional override)

### Database
- [ ] Migration: add `pack_index` column to `block_overlays_v2`
- [ ] Migration: add partial index on `(run_id, pack_index)` where `status = 'pending'`
- [ ] Migration: `claim_overlay_pack(run_id, worker_id)` RPC — claim all blocks in next unclaimed pack

### Courier (edge function)
- [ ] Refactor `callLLM()` to accept a JSON array of blocks and return a JSON array of results
- [ ] Add `cache_control: { type: "ephemeral" }` to system message
- [ ] Update to claim by pack instead of arbitrary batch
- [ ] Add response validation (completeness, no extras, schema conformance)
- [ ] Add partial-failure handling (write successful results, return missing to pending)
- [ ] Update prompt template for multi-block instruction

### Tests
- [ ] Pack of 10 metadata blocks — all 10 results written correctly
- [ ] Pack where model omits 1 block — 9 written, 1 returned to pending
- [ ] Pack where API call fails entirely — all blocks returned to pending
- [ ] Fallback to pack_size=1 for oversized blocks
- [ ] Existing runs with `pack_index = NULL` still work via legacy 1:1 path

### Docs
- [ ] Update Phase 2 checklist in `0209-unified-remaining-work.md`

---

## What This Does NOT Change

- **Human review flow.** Overlays still go through `overlay_jsonb_staging` → user review → `overlay_jsonb_confirmed`. Packing is invisible to the review UX.
- **Export format.** The canonical `{ immutable, user_defined }` JSONL shape is unchanged. Downstream consumers are unaffected.
- **Fault isolation guarantee.** Each block still gets its own overlay row with independent status. A failure in one block does not corrupt another block's result, even within the same pack.
- **Concurrency model.** Multiple courier invocations can still run concurrently. Pack-level claiming with `FOR UPDATE SKIP LOCKED` prevents double-processing. Each courier processes exactly one pack per invocation.

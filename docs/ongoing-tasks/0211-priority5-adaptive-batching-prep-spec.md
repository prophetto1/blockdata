# Priority 5: Adaptive Multi-Block Batching - Preparation Spec

**Date:** 2026-02-12
**Status:** In Progress (runtime integration underway; benchmark/deploy evidence pending)
**Purpose:** Everything a developer needs to implement multi-block batching in the worker
**Canonical tracker:** `docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md` (Section 12)

---

## 1) What This Is

Today the worker makes **1 API call per block**. For a 200-block document with a 25K-token system prompt, that means 200 calls repeating the same system prompt 200 times (97% waste on input tokens).

Multi-block batching packs **N blocks into a single API call**. The system prompt is sent once per batch instead of once per block. Combined with prompt caching (Priority 4), this is the highest-impact cost optimization.

This document is a target-state implementation spec, not a runtime status snapshot.

**Target savings (from token optimization doc):**

| Approach | API Calls (200 blocks) | Estimated Cost | Savings vs Current |
|---|---|---|---|
| Current (1/call) | 200 | $15.97 | - |
| Caching only | 200 | $2.27 | 86% |
| Batching only (10/call) | 20 | $2.12 | 87% |
| Caching + batching | 20 | $0.89 | **94%** |

---

## 2) Current Worker Architecture (What Changes)

### Current flow (`worker/index.ts`)

```
claim_overlay_batch(run_id, batch_size=25) â†’ claimed block_uids[]
    â†“
for each block_uid:
    load block_content, block_type from blocks_v2
    callLLM(single block) â†’ { data, usage }
    write overlay_jsonb_staging + status=ai_complete
    â†“
update run rollup
```

### Key current function: `callLLM`

```typescript
callLLM(apiKey, model, temperature, maxTokens, promptCachingEnabled,
        systemPrompt, blockPrompt, blockContent, blockType, schemaProperties)
â†’ { data: Record<string, unknown>, usage: LlmUsage }
```

- Sends **one** user message with one block's content
- Uses `tool_choice: { type: "tool", name: "extract_fields" }` to force structured output
- Tool schema is the schema's `properties` directly
- Returns one object of extracted fields

### What stays the same

- Claim mechanism (`claim_overlay_batch` RPC with `FOR UPDATE SKIP LOCKED`)
- Claim ordering (by `block_index` â€” Priority 3 locked this)
- Release/retry logic (`releaseClaimed` helper)
- Run rollup update
- API key resolution chain (user key â†’ platform fallback)
- Error handling: 401/403 â†’ mark key invalid, stop batch
- Cancellation check

### What changes

| Component | Current | Batched |
|---|---|---|
| `callLLM` signature | Single block | Array of blocks |
| Tool schema | Flat object of schema fields | Wrapper with `results` array |
| User message | One block's content | Multiple blocks, each labeled |
| Response parsing | Extract `toolUse.input` | Extract `toolUse.input.results[]`, match to block_uids |
| Per-block loop | Call LLM inside loop | Build packs â†’ call LLM per pack â†’ unpack results |
| `max_tokens` | Per-block budget | Per-pack budget (blocks Ã— per-block estimate) |

---

## 3) Tool Schema Design

### Recommended: Array-of-results wrapper

The tool schema wraps the existing per-block schema properties inside a `results` array, with each item keyed by `block_uid`:

```typescript
const tool = {
  name: "extract_fields_batch",
  description: "Extract structured fields for each block. Return one result per block_uid.",
  input_schema: {
    type: "object",
    properties: {
      results: {
        type: "array",
        description: "One extraction result per block, in the same order as the input blocks.",
        items: {
          type: "object",
          properties: {
            block_uid: {
              type: "string",
              description: "The block_uid this result corresponds to."
            },
            // ...spread schema properties here
            ...schemaProperties,
          },
          required: ["block_uid"],
        },
      },
    },
    required: ["results"],
  },
};
```

**Why array, not keyed-by-uid object:** JSON Schema can't define dynamic property names. An array with explicit `block_uid` per item is structurally valid and lets the model produce results in order.

**Why not multiple tool calls:** `tool_choice: { type: "any" }` lets the model make multiple `tool_use` blocks, but it's harder to guarantee one per block and the model might skip some. A single tool call with an array is more reliable and easier to validate.

### Fallback for single-block

When only 1 block is in the pack, you can either:
- Still use the batched schema (consistent code path)
- Fall back to the current `extract_fields` schema (avoids the `results` wrapper overhead)

Recommendation: **always use the batched schema** for simplicity. The overhead of the wrapper is negligible.

---

## 4) User Message Format

```typescript
function buildBatchUserMessage(
  blockPrompt: string,
  blocks: Array<{ block_uid: string; block_type: string; block_content: string }>
): string {
  const header = `${blockPrompt}\n\nProcess each block below. Return a result for EVERY block_uid in the "results" array.\n\n`;

  const blockSections = blocks.map((b, i) =>
    `--- Block ${i + 1} ---\n` +
    `block_uid: ${b.block_uid}\n` +
    `block_type: ${b.block_type}\n\n` +
    `${b.block_content}`
  ).join("\n\n");

  return header + blockSections;
}
```

**Design notes:**
- Each block is clearly delimited with its `block_uid` so the model can reference it in results.
- `block_type` is included because some schemas care about it (e.g., skip headings, treat tables differently).
- The prompt explicitly asks for results for EVERY block_uid â€” models sometimes skip blocks they consider trivial.

---

## 5) Pack Sizing Algorithm

### Constraints

| Constraint | Source | Typical Value |
|---|---|---|
| Context window (input + output) | Model spec | 200K (Sonnet), 1M (GPT-4.1) |
| Max output tokens | API parameter | 8,192 default; up to 64K extended (Sonnet) |
| System prompt tokens | Schema `prompt_config.system_instructions` | 50â€“25,000 |
| Tool definition tokens | Schema `properties` complexity | 200â€“1,000 |
| Per-block prompt template | Fixed overhead | ~50 tokens |
| Per-block content | Variable per document | 50â€“2,000 tokens (avg ~325) |
| Per-block output | Variable per schema | 100â€“500 tokens (avg ~200) |

### The real limiter is output tokens

With default `max_tokens=8192` and ~200 tokens output per block:
- **Max blocks per pack: ~40** (8192 / 200)

With extended output (`max_tokens=16384`):
- **Max blocks per pack: ~80**

Input is rarely the bottleneck â€” 200K context fits hundreds of blocks even with a large system prompt.

### Algorithm

```typescript
type PackSizingConfig = {
  maxOutputTokens: number;       // from model config or request param
  estimatedOutputPerBlock: number; // default 250 (conservative)
  maxBlocksPerPack: number;       // hard cap, default 25
  safetyMargin: number;           // output budget multiplier, default 0.85
};

function calculatePackSize(
  config: PackSizingConfig,
  claimedBlocks: number,
): number {
  const outputBudget = Math.floor(config.maxOutputTokens * config.safetyMargin);
  const byOutput = Math.floor(outputBudget / config.estimatedOutputPerBlock);

  return Math.min(
    byOutput,
    config.maxBlocksPerPack,
    claimedBlocks,
  );
}
```

**Safety margin (0.85):** The model also produces structural JSON overhead (braces, commas, `block_uid` strings, the `results` wrapper). Reserving 15% accounts for this.

**Hard cap (25):** Even if budget allows 40+, quality may degrade at very high counts. Start conservative, benchmark, increase.

### Splitting claimed blocks into packs

```typescript
function splitIntoPacks<T>(items: T[], packSize: number): T[][] {
  const packs: T[][] = [];
  for (let i = 0; i < items.length; i += packSize) {
    packs.push(items.slice(i, i + packSize));
  }
  return packs;
}
```

Claim ordering is by `block_index` (Priority 3), so consecutive blocks are packed together. This is good â€” contextually adjacent blocks help the model maintain coherence.

---

## 6) Response Parsing and Validation

### Parse the batched tool response

```typescript
type BatchLlmResult = {
  results: Array<{
    block_uid: string;
    [field: string]: unknown;
  }>;
  usage: LlmUsage;
};

function parseBatchResponse(
  apiResponse: any,
  expectedBlockUids: string[],
): BatchLlmResult {
  const toolUse = apiResponse.content?.find((c: any) => c.type === "tool_use");
  if (!toolUse?.input?.results || !Array.isArray(toolUse.input.results)) {
    throw new Error("No valid results array in batched tool response");
  }

  const results = toolUse.input.results as Array<{ block_uid: string; [k: string]: unknown }>;

  // Validate: every expected block_uid has a result
  const returnedUids = new Set(results.map(r => r.block_uid));
  const missing = expectedBlockUids.filter(uid => !returnedUids.has(uid));

  if (missing.length > 0) {
    // Partial result â€” some blocks were skipped by the model
    // These need to be retried (either in a smaller pack or individually)
    console.warn(`Batched response missing ${missing.length} block_uids: ${missing.slice(0, 3).join(", ")}...`);
  }

  return {
    results,
    usage: {
      input_tokens: Number(apiResponse.usage?.input_tokens ?? 0),
      output_tokens: Number(apiResponse.usage?.output_tokens ?? 0),
      cache_creation_input_tokens: Number(apiResponse.usage?.cache_creation_input_tokens ?? 0),
      cache_read_input_tokens: Number(apiResponse.usage?.cache_read_input_tokens ?? 0),
    },
  };
}
```

### Validation rules

1. **Every expected `block_uid` must appear in results.** Missing = model skipped it.
2. **No duplicate `block_uid` in results.** If duplicates, take the first.
3. **No unexpected `block_uid` in results.** Ignore results for uids not in the pack (model hallucinated a uid).
4. **Each result must have the `block_uid` field.** Results without it can't be mapped and are discarded.

---

## 7) Overflow and Retry Design

### When output gets truncated

If the model hits `max_tokens` before finishing the `results` array, the `tool_use` JSON will be **incomplete**. The API response will have `stop_reason: "max_tokens"` instead of `stop_reason: "tool_use"`.

**Detection:**

```typescript
if (apiResponse.stop_reason === "max_tokens") {
  // Output was truncated â€” pack was too large for the output budget
}
```

**Recovery strategy: split and retry**

1. Record which block_uids got valid results (if any â€” partial JSON may be unparseable).
2. Write results for successfully parsed blocks.
3. Split remaining blocks into **smaller packs** (halve the pack size).
4. Retry with the smaller packs.
5. If a single-block pack still truncates, fall back to the current 1-block-per-call path and accept the cost.

```typescript
async function processPackWithOverflowRetry(
  pack: BlockInfo[],
  maxDepth: number = 3,
  depth: number = 0,
): Promise<void> {
  if (depth >= maxDepth) {
    // Fall back to single-block processing for remaining blocks
    for (const block of pack) {
      await processSingleBlock(block);
    }
    return;
  }

  const response = await callLLMBatch(pack);

  if (response.stopReason === "max_tokens" || response.missing.length > 0) {
    // Write what we got
    for (const result of response.parsed) {
      await writeOverlayStaging(result);
    }
    // Retry missing with smaller packs
    const halfSize = Math.max(1, Math.ceil(response.missing.length / 2));
    const retryPacks = splitIntoPacks(response.missing, halfSize);
    for (const retryPack of retryPacks) {
      await processPackWithOverflowRetry(retryPack, maxDepth, depth + 1);
    }
  } else {
    // Full success â€” write all results
    for (const result of response.parsed) {
      await writeOverlayStaging(result);
    }
  }
}
```

### When the model skips blocks (no truncation)

Sometimes the model returns `stop_reason: "tool_use"` (successful completion) but the `results` array is missing some block_uids. This means the model decided to skip them.

**Recovery:** Re-process skipped blocks in a smaller pack or individually. After 2 retries, mark as `failed` with `last_error: "Model skipped block after retries"`.

---

## 8) Updated Worker Loop (Pseudocode)

```
POST /functions/v1/worker { run_id, batch_size=25, pack_size=10 }

1. claim_overlay_batch(run_id, batch_size, worker_id) â†’ claimed[]
2. Load run + schema + API key (same as current)
3. Check cancellation (same as current)
4. Load block content for all claimed block_uids (same as current)

5. Calculate effective pack size:
   packSize = min(
     floor(maxTokens * 0.85 / estimatedOutputPerBlock),
     requestPackSize || 10,
     claimed.length
   )

6. Split claimed blocks into packs:
   packs = splitIntoPacks(claimed, packSize)

7. For each pack:
   a. Build batched user message (all blocks in pack)
   b. Call LLM with batched tool schema
   c. Parse response, validate block_uid mapping
   d. Handle overflow (split-and-retry if truncated)
   e. For each successfully parsed result:
      - Write overlay_jsonb_staging + status=ai_complete
      - Increment succeeded counter
   f. For each missing/failed block:
      - Check attempt_count, retry or mark failed (same logic as current)

8. Update run rollup (same as current)
9. Return response with usage totals
```

### New request parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `batch_size` | int | 25 | How many blocks to claim from the queue (existing) |
| `pack_size` | int | 10 | How many blocks to put in one API call (new) |
| `estimated_output_per_block` | int | 250 | Token estimate for output budget calculation (new) |
| `batching_enabled` | bool | true | Feature flag — when false, falls back to 1-per-call (new) |

**Naming clarity:** `batch_size` is how many blocks the worker claims from the DB queue. `pack_size` is how many claimed blocks go into one LLM API call. `batch_size >= pack_size` always. A single worker invocation makes `ceil(batch_size / pack_size)` API calls.

---

## 9) What Does NOT Change

- **Claim RPC** â€” still `claim_overlay_batch`. The DB doesn't care if blocks are processed 1-per-call or 10-per-call.
- **Overlay writes** â€” still one `UPDATE` per block_uid to `block_overlays_v2`. The overlay table has no concept of packs.
- **Run rollup** â€” still counts `ai_complete + confirmed` vs `failed` vs `pending + claimed`.
- **Retry semantics** â€” `attempt_count` is still per block, not per pack. A pack failure increments attempt_count for each block in the pack.
- **Cancellation** â€” still check `run.status === 'cancelled'` before processing.
- **API key resolution** â€” user key â†’ platform key chain is unchanged.
- **Prompt caching** â€” `cache_control` on system message works the same regardless of how many blocks are in the user message. In fact, batching makes caching MORE effective because the same cached system prompt serves N blocks per call instead of 1.

---

## 10) Anthropic API Reference Notes

### Token limits by model

| Model | Context Window | Default Max Output | Extended Max Output |
|---|---|---|---|
| Claude Sonnet 4.5 | 200K | 8,192 | 64K (with `anthropic-beta: max-tokens-3-5-sonnet-2025-04-14`) |
| Claude Haiku 4.5 | 200K | 8,192 | â€” |
| Claude Opus 4 | 200K | 32,768 | â€” |

### Tool use with `tool_choice: { type: "tool" }`

- Forces the model to produce exactly **one** tool call.
- The model will always return a `tool_use` content block (or hit `max_tokens`).
- This is what we want for batching â€” one `extract_fields_batch` call returning all results.

### Prompt caching interaction

Caching caches the **system message** content. With batching:
- First API call in a worker invocation: cache WRITE (1.25x input price for system tokens)
- Subsequent calls in same invocation: cache READ (0.10x input price for system tokens)
- Cache TTL: 5 minutes (refreshed on each hit)

Batching reduces the number of API calls, so there are fewer cache read opportunities per invocation. But the total system prompt token cost is still dramatically lower because it's sent N times fewer.

**Combined savings math (200 blocks, 25K system prompt):**
- Current: 200 calls Ã— 25K = 5M system tokens
- Caching only: 1 write + 199 reads = 25K Ã— 1.25 + 199 Ã— 25K Ã— 0.10 = 529K effective tokens
- Batching (10/call): 20 calls Ã— 25K = 500K system tokens
- Caching + batching: 1 write + 19 reads = 25K Ã— 1.25 + 19 Ã— 25K Ã— 0.10 = 79K effective tokens

---

## 11) Benchmark Requirements (Priority 5 Exit Criteria)

From the gate tracker:

1. **No quality regression vs baseline** â€” compare batched vs single-block outputs on same blocks.
2. **Significant call-count reduction** â€” e.g., 200 calls â†’ 20 calls.
3. **Queue correctness invariants** â€” every claimed block gets a result or a documented failure. No stranded overlays. No duplicate results.
4. **Deterministic block_uid mapping** â€” every output maps to exactly one input block.
5. **Overflow behavior does not lose data** â€” truncated packs retry successfully.
6. **Coverage includes both schema types required by the gate** â€” at least one extraction schema and one revision-heavy schema.

### Suggested benchmark plan

1. Run an **extraction schema suite** on fixed input:
   - Run A1: `batching_enabled=false` (1-per-call baseline)
   - Run A2: `batching_enabled=true, pack_size=10`
   - Run A3: `batching_enabled=true, pack_size=25`
2. Run a **revision-heavy schema suite** on fixed input:
   - Run B1: `batching_enabled=false` (1-per-call baseline)
   - Run B2: `batching_enabled=true, pack_size=10`
   - Run B3: `batching_enabled=true, pack_size=25`
3. For each suite, compare call count, total tokens, cost, and quality (diff overlays field-by-field).
4. Record both suites and conclusions in `docs/ongoing-tasks/0211-worker-optimization-benchmark-results.md`.

---

## 12) Implementation Checklist

- [x] Add `callLLMBatch` function (or refactor `callLLM` to accept block array)
- [x] Add `extract_fields_batch` tool schema builder
- [ ] Add `buildBatchUserMessage` function
- [x] Add `parseBatchResponse` with uid validation
- [ ] Add `calculatePackSize` function
- [x] Add `splitIntoPacks` utility
- [x] Add overflow detection (`stop_reason === "max_tokens"`) and split-retry
- [x] Add `batching_enabled` feature flag (env + request override, same pattern as prompt caching)
- [x] Add `pack_size` request parameter
- [x] Update main worker loop to use packs instead of per-block iteration
- [x] Preserve single-block fallback when `batching_enabled=false`
- [x] Update usage tracking to aggregate across packs
- [x] Add pack-level metrics to response (`packs_processed`, `avg_blocks_per_pack`)
- [ ] Write benchmark script (or extend existing P4 script)
- [ ] Run benchmark and record evidence
- [ ] Deploy and update gate ledger

---

## 13) Risk Mitigations

| Risk | Mitigation |
|---|---|
| Model skips blocks in large packs | Validate all block_uids in response; retry missing individually |
| Output truncation loses partial results | Detect `stop_reason`, attempt partial parse, split-and-retry |
| Quality degrades at high pack sizes | Start with pack_size=10, benchmark quality before increasing |
| Pack sizing miscalculates and overflows | Conservative safety margin (0.85); hard cap on pack_size |
| Feature breaks existing single-block path | `batching_enabled` flag; false = exact current behavior |
| Different schemas need different pack sizes | `estimated_output_per_block` is configurable per request |

---

## 14) Key Files

| File | Role |
|---|---|
| `supabase/functions/worker/index.ts` | Worker implementation (primary change target) |
| `supabase/functions/_shared/supabase.ts` | Admin client creation |
| `supabase/functions/_shared/env.ts` | Environment variable helpers |
| `supabase/migrations/20260210*_010_*.sql` | `claim_overlay_batch` RPC |
| `supabase/migrations/20260212*_017_*.sql` | Claim ordering by `block_index` |
| `scripts/benchmark-worker-prompt-caching.ps1` | P4 benchmark (extend or clone for P5) |
| `docs/ongoing-tasks/0211-worker-token-optimization-patterns.md` | Cost analysis and optimization tiers |
| `docs/ongoing-tasks/0211-admin-config-registry.md` | Config ownership (pack_size bounds â†’ admin policy) |

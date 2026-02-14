# Worker Token Optimization Patterns

**Date:** 2026-02-11
**Status:** Design analysis — informs worker v2 implementation
**Depends on:** Worker pipeline (Workstream B in `0211-core-workflows-before-assistant-plan.md`)

---

## 1) Problem Statement

The current worker (`supabase/functions/worker/index.ts`) processes blocks one-per-call, sending the full system instructions (schema global prompt) with every API call. For a representative workload — a 50K-word document with a 25K-token reference document as system instructions — this means:

- 200 blocks, 200 API calls
- 25,000 tokens of identical system instructions repeated 200 times
- **5,000,000 tokens of pure waste** ($15 of a $16 total cost)
- Actual block content across the entire document: ~65,000 tokens ($0.20)

The system instructions constitute **97% of the input cost** and are identical on every call.

---

## 2) Reference Calculation

Parameters (concrete example):

| Parameter | Value | Source |
|---|---|---|
| Document | 50,000 words | ~65,000 tokens |
| System instructions | 12,500 words | ~25,000 tokens (e.g. Elements of Style) |
| Block count | ~200 | Avg ~250 words/block (paragraph-level mdast) |
| Tokens per block | ~325 | 65,000 / 200 |
| Tool/schema definition | ~500 tokens | Stable across calls |
| Per-block prompt template | ~100 tokens | "Extract the following fields..." |
| Output per block | ~200 tokens | Structured JSON extraction result |
| Model | Claude Sonnet 4.5 | $3/M input, $15/M output |

### Cost by approach

| Approach | API Calls | Total Cost | Savings | Implementation Effort |
|---|---|---|---|---|
| **Current (1 block/call)** | 200 | **$15.97** | — | — |
| Prompt caching only | 200 | $2.27 | 86% | Trivial (1 header) |
| Multi-block batching (10/call) | 20 | $2.12 | 87% | Medium (restructure worker) |
| Caching + batching | 20 | $0.89 | 94% | Medium |
| Caching + batching + Batch API | 20 | $0.45 | 97% | Medium + async queue |

### Where the money goes (current approach)

| Component | Total Tokens | Cost | % of Input |
|---|---|---|---|
| System instructions repeated 200x | 5,000,000 | $15.00 | 97.2% |
| Tool definition repeated 200x | 100,000 | $0.30 | 1.5% |
| Per-block prompts | 20,000 | $0.06 | 0.3% |
| **Actual block content** | **65,000** | **$0.20** | **1.0%** |

---

## 3) Optimization Tiers

### Tier 1: Prompt Caching (Immediate Win)

**What:** Anthropic's prompt caching stores the system prompt server-side across calls. Subsequent calls pay 10% of the input price for cached tokens.

**How:** Add `cache_control: { type: "ephemeral" }` to the system message in `callLLM`.

**Savings:** 86% (system instructions go from $3/M to $0.30/M on reads).

**Quality risk:** None. The model receives identical content.

**Pricing (Anthropic):**
- Cache write (first call): input price x 1.25
- Cache read (subsequent): input price x 0.10
- Cache TTL: 5 minutes (refreshed on each hit)

**Implementation:** One-line change in the worker's `callLLM` function. The system message gets a `cache_control` block, and the `anthropic-beta: prompt-caching-2024-07-31` header is added.

### Tier 2: Multi-Block Batching

**What:** Pack multiple blocks into a single API call. The system instructions are sent once per batch instead of once per block.

**How:** Restructure the worker to:
1. Calculate available context budget: `context_limit - system_tokens - tool_tokens - output_reserve`
2. Pack as many blocks as fit into the remaining input budget
3. Modify the tool schema to return an array of per-block results
4. Split into batches and call the API once per batch

**Batch sizing for the reference workload:**

| Context Window | System + Tool | Output Reserve | Available for Blocks | Blocks/Call | Total Calls |
|---|---|---|---|---|---|
| 200K (Sonnet) | 25,500 | 20,000 | 154,500 | ~363 (all 200 fit) | 1-2 |
| 128K (GPT-4.1) | 25,500 | 16,000 | 86,500 | ~203 (all 200 fit) | 1 |
| 32K (smaller models) | 25,500 | 4,000 | 2,500 | ~5 | 40 |

**Output token constraint:** The real limiter is often output, not input. With 200 tokens output per block and 8,192 max output tokens, that's ~40 blocks per call. With higher output limits (some models support 16K-64K), more blocks fit.

**Practical batch size:** 10-40 blocks per call depending on model output limits.

**Quality risk:** Low for extraction tasks. The model processes each block independently within the same call. Quality may slightly degrade at very high block counts if the model loses focus, but structured tool output with per-block keys mitigates this.

### Tier 3: RAG Over System Instructions (Selective Retrieval)

**What:** Instead of sending the full 25K-token reference document on every call, pre-index it and retrieve only the rules relevant to each block's content.

**How:**
1. Chunk the reference document by rule/chapter
2. Embed chunks into a vector index (pgvector in Supabase, or an external service)
3. For each block (or batch), retrieve the top-K most relevant chunks
4. Send only those chunks (~2-3K tokens) as system context

**Savings:** Reduces system instruction overhead from 25K to ~2-3K tokens per call — a further 8-10x on the system portion.

**Quality risk:** **Moderate.** Retrieval misses mean the model won't apply rules it didn't receive. For a style guide with 18 distinct chapters, retrieval quality is decent but imperfect. A rule about comma usage won't be retrieved for a block that happens to have a comma problem that's described differently than the retrieval query expects.

**When it's worth it:** Large reference corpora (legal codes, multi-document style guides, domain knowledge bases) where only a fraction is relevant per block. Less valuable for a single coherent style guide applied uniformly.

### Tier 4: Batch API (Async Processing)

**What:** Anthropic's Batch API accepts up to 10,000 requests and processes them asynchronously within 24 hours at 50% discount on all token costs.

**How:** Instead of calling the Messages API synchronously per batch, submit all batches as a single Batch API request. Poll for completion or register a webhook.

**Savings:** 50% off the already-optimized cost. Stacks with caching and batching.

**Quality risk:** None. Same model, same outputs — just async.

**Tradeoff:** Results are not immediate. Acceptable for batch document processing, not for interactive/real-time use cases.

---

## 4) Architecture Pattern: Worker as MCP Bridge

### Constraint

Models called via API (Anthropic, OpenAI, Google) **cannot** make outbound connections. They cannot connect to MCP servers, databases, or any external service. They only see what the caller puts in the request: messages, tools, system prompt.

### Pattern

The **worker** acts as the MCP client, bridging between the model's tool calls and the platform's data layer:

```
User's model       Worker              Platform MCP Server     PostgreSQL
(on Anthropic)  ←→  (Supabase Edge)  ←→  (Streamable HTTP)  ←→  (Supabase DB)
     ↑                    ↑
 tool_use/result      MCP protocol
 (API wire format)    (standard)
```

1. Platform hosts an MCP server (Streamable HTTP transport) exposing data access tools
2. Worker connects to the MCP server as a client
3. Worker translates MCP tool definitions into the provider's tool format (Anthropic `tools[]`, OpenAI `functions[]`, etc.)
4. Model returns `tool_use` → worker relays to MCP server → gets result → sends `tool_result` back to model
5. Multi-turn loop until the model produces its final structured output

### MCP Tools for Token Optimization

| Tool | Purpose | Token Impact |
|---|---|---|
| `search_style_rules(query)` | RAG over reference document — return relevant rules only | 25K → ~2K per call |
| `get_block_batch(start, count)` | Model pulls blocks on demand, enabling streaming/pagination | Enables lazy loading |
| `get_schema_for_block_type(type)` | Return only schema fields relevant to this block type | Reduces schema overhead |
| `lookup_previous_results(block_uid)` | Check neighboring blocks' results for consistency | Avoids redundant analysis |

### Multi-Provider Benefit

The platform already supports 4 providers (Anthropic, OpenAI, Google AI, Custom). A single MCP server defines the data access layer once. Each provider's worker adapter translates between:

- MCP tool definitions ↔ Anthropic `tools[]`
- MCP tool definitions ↔ OpenAI `functions[]`
- MCP tool definitions ↔ Google `functionDeclarations[]`

One data layer, any model.

### When the Model Decides What It Needs

The shift from "worker pre-loads everything into the prompt" to "model requests what it needs via tools" enables:

- **Heading block?** Model skips `search_style_rules`. Zero reference tokens consumed.
- **Long paragraph?** Model calls `search_style_rules("comma splices, passive voice")` → gets 2K tokens of relevant rules.
- **Block references a defined term?** Model calls `lookup_previous_results` for consistency checking.
- **Simple block type (e.g., image caption)?** Model uses a cheaper/faster sub-tool or skips entirely.

This is fundamentally different from prompt caching (still sends everything, just cheaper). The model consumes only the tokens it actually needs.

---

## 5) Pre-Filtering: Skip Blocks That Don't Need Processing

Not all blocks in a document need LLM analysis. The worker can skip blocks before calling the API:

| Block Type | Skip Condition | Savings |
|---|---|---|
| `image` | No text content to analyze | 100% for these blocks |
| `table` | Schema doesn't define table-relevant fields | 100% for these blocks |
| `heading` | Length < 10 words, no style rules apply | 100% for these blocks |
| `code_block` | Schema is about prose style, not code | 100% for these blocks |
| Empty/whitespace | No content | 100% for these blocks |

For a typical document, 10-30% of blocks may be skippable, reducing the total block count before any API calls.

---

## 6) Model Routing: Right Model for the Job

Not all blocks need the most capable (and expensive) model:

| Block Characteristic | Suggested Model | Cost Ratio |
|---|---|---|
| Complex analysis, nuanced rules | Claude Sonnet 4.5 / GPT-4.1 | 1x (baseline) |
| Simple extraction, clear fields | Claude Haiku / GPT-4.1-mini | 0.04-0.10x |
| Binary classification (relevant/not) | Haiku / Flash | 0.04x |

The worker can route based on block type, content length, or schema complexity. A two-pass approach:
1. **Pass 1 (cheap model):** Classify blocks as simple/complex
2. **Pass 2 (appropriate model):** Process each block with the model matched to its complexity

---

## 7) Implementation Priority

Ordered by impact-to-effort ratio:

| Priority | Optimization | Effort | Impact | Cumulative Cost |
|---|---|---|---|---|
| **1** | Prompt caching | Trivial | 86% savings | $2.27 |
| **2** | Multi-block batching | Medium | +8% savings | $0.89 |
| **3** | Pre-filtering | Low | Variable (10-30% fewer blocks) | $0.60-0.80 |
| **4** | Batch API (async) | Medium | +50% off remaining | $0.30-0.45 |
| **5** | Model routing | Medium | Variable per schema | Depends on mix |
| **6** | MCP bridge + RAG | High | Replaces system instructions with retrieval | $0.20-0.30 |

### Recommended implementation sequence

**Phase 1 (immediate):** Add prompt caching to the existing worker. One-line change, zero risk, 86% savings.

**Phase 2 (worker v2):** Restructure worker for multi-block batching. This is the natural point to also add pre-filtering. Combined with caching, achieves 94%+ savings.

**Phase 3 (platform maturity):** MCP bridge architecture for multi-provider tool access, RAG over reference documents, and model routing. This is the long-term architecture that scales to large reference corpora and diverse schemas.

---

## 8) Key Constraints and Tradeoffs

| Constraint | Impact | Mitigation |
|---|---|---|
| Output token limits (8K default) | Caps blocks-per-batch at ~40 | Use models with higher output limits; split into more batches |
| Prompt cache TTL (5 min) | Cache evicts if worker is idle | Keep batches flowing; pre-warm cache |
| RAG retrieval quality | Missed rules = missed analysis | Use full context for critical schemas; RAG for large corpora |
| Multi-block quality degradation | Model may lose focus on large batches | Test quality at various batch sizes; find the sweet spot |
| Multi-provider tool format differences | Each API has different tool calling conventions | MCP abstraction layer normalizes this |
| Batch API latency (up to 24h) | Not suitable for interactive use | Offer both: real-time (Tier 1-2) and async batch (Tier 4) |

---

## 9) Context Window Reference

For batch sizing calculations:

| Model | Context Window | Max Output | Provider |
|---|---|---|---|
| Claude Sonnet 4.5 | 200K | 8,192 (default) / 64K (extended) | Anthropic |
| Claude Haiku 4.5 | 200K | 8,192 | Anthropic |
| GPT-4.1 | 1M | 32,768 | OpenAI |
| GPT-4.1-mini | 1M | 32,768 | OpenAI |
| Gemini 2.5 Pro | 1M | 65,536 | Google |
| Gemini 2.5 Flash | 1M | 65,536 | Google |

With GPT-4.1 or Gemini 2.5's 1M context, the entire 50K-word document + 25K-token reference + all 200 blocks could be processed in a **single call** if the output token limit allows.

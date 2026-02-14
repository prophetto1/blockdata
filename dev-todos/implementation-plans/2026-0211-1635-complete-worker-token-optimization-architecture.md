# 2026-0211-1635-complete-worker-token-optimization-architecture

filename (UID): `2026-0211-1635-complete-worker-token-optimization-architecture.md`  
problem: Worker optimization direction is defined across prompt caching, batching, pre-filtering, model routing, Batch API async mode, and MCP/RAG architecture, but current implementation only covers part of that stack, leaving major cost and scalability gains unfinished.  
solution: Complete worker optimization as one architecture implementation slice that keeps existing prompt-caching + batching gains, adds deterministic pre-filtering and model routing, introduces optional async batch mode, and lands MCP/RAG retrieval pathways with benchmarked evidence.  
scope: `supabase/functions/worker` execution path, optimization controls, async mode, tool-bridge architecture, retrieval integration, and benchmark/quality verification artifacts.

## Included Implementation Rules

1. Structured extraction correctness is non-negotiable: each processed block must map deterministically to exactly one output payload.
2. Prompt caching and multi-block batching remain enabled by default unless explicitly overridden by runtime policy.
3. Output-token limits are treated as a first-class batching constraint; overflow triggers deterministic split/retry behavior.
4. Pre-filtering may skip only blocks that meet explicit deterministic skip rules and must leave audit metadata for skipped blocks.
5. Model routing decisions must be explainable and deterministic from declared routing policy inputs.
6. Async Batch API mode is optional and separate from interactive/synchronous mode.
7. MCP bridge and retrieval features must preserve provider abstraction across Anthropic/OpenAI/Google/custom adapters.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Lock and harden the existing prompt-caching and adaptive batching baseline by centralizing pack-sizing policy resolution, keeping cache headers/system `cache_control` usage stable, and emitting explicit runtime metrics for pack size, split events, and token-budget assumptions for every worker call. | Updated `supabase/functions/worker/index.ts` plus policy parsing alignment in `supabase/functions/_shared/admin_policy.ts` (repo state before action: prompt caching + adaptive batching already implemented). |
| 2 | Implement deterministic pre-filtering before LLM invocation so clearly non-applicable blocks (for example empty/whitespace, unsupported block types for current schema policy) are short-circuited with tracked skip reasons instead of consuming LLM tokens. | Updated `supabase/functions/worker/index.ts` with pre-filter branch + persisted skip metadata in overlay records (repo state before action: no explicit pre-filter skip pipeline found). |
| 3 | Implement policy-driven model routing that classifies work complexity and routes blocks/packs to appropriate model tiers while preserving schema constraints and provider boundaries, including explicit fallback behavior when preferred models are unavailable. | Updated routing logic in `supabase/functions/worker/index.ts` and runtime model policy fields in shared config paths (repo state before action: no complexity-based routing path found). |
| 4 | Add optional async Batch API execution mode for high-throughput jobs, including job submission, status polling/webhook handling, and deterministic reconciliation back into overlay/run state so synchronous and asynchronous execution modes can coexist safely. | New async execution module under `supabase/functions/worker/` (and any required queue/state migration) with batch lifecycle handling (repo state before action: no Batch API async flow found). |
| 5 | Implement worker-side MCP bridge scaffolding for tool-call translation so provider tool formats map to one platform tool contract, and worker can execute tool loops (`tool_use` -> tool result -> model continuation) without embedding full corpora in every prompt. | New worker bridge modules under `supabase/functions/worker/` and shared tool adapter utilities under `supabase/functions/_shared/` (repo state before action: no MCP bridge implementation found in worker path). |
| 6 | Add retrieval-backed reference context (`search_style_rules` pattern) that chunks and indexes reference material and injects only relevant chunks into prompts/tool responses, with safe fallback to full-context mode for schemas marked retrieval-critical. | New retrieval integration code in worker/shared modules and required storage/index migration artifacts (repo state before action: no retrieval integration found in worker path). |
| 7 | Extend benchmark and regression coverage to measure cost, latency, and extraction quality across baseline, pre-filtering, routing, and async modes, preserving existing benchmark scripts while adding deterministic comparison outputs. | Updated `scripts/benchmark-worker-batching.ps1`, `scripts/benchmark-worker-prompt-caching.ps1`, related benchmark scripts/log outputs, and worker regression test coverage (repo state before action: benchmark scripts/logs exist for caching + batching only). |
| 8 | Produce one final optimization verification artifact that records before/after cost profile, quality checks, and mode-selection rules (sync vs async), with binary pass/fail status for each optimization tier delivered in this plan. | `dev-todos/_complete/2026-0211-worker-token-optimization-verification.md` (repo state before action: no consolidated final verification artifact). |

## Completion Logic

This plan is complete only when all conditions below are true:

1. Baseline lock: prompt caching + adaptive batching remain operational and metric-visible.
2. Pre-filter lock: deterministic skip rules are active and skip decisions are auditable in overlay/run data.
3. Routing lock: model routing policy executes deterministically with documented fallback behavior.
4. Async lock: Batch API mode can submit, monitor, and reconcile results without breaking sync mode.
5. Bridge lock: worker tool bridge supports provider-agnostic tool translation loop.
6. Retrieval lock: retrieval-backed context path is operational with safe fallback strategy.
7. Benchmark lock: comparative benchmark outputs exist for baseline vs optimized modes.
8. Final-output lock: `dev-todos/_complete/2026-0211-worker-token-optimization-verification.md` exists with binary tier outcomes.


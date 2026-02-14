# Pass Work - 2026-0211-1635-complete-worker-token-optimization-architecture

Source: `dev-todos/action-plans/0211-worker-token-optimization-patterns.md`  
Plan: `dev-todos/implementation-plans/2026-0211-1635-complete-worker-token-optimization-architecture.md`

## Pass 1: Extraction

| Item # | Source | Verbatim (abbrev) | Type |
|---|---|---|---|
| 1 | 1 / Problem | Current worker sends full repeated system instructions per block; cost waste is dominant. | constraint |
| 2 | Tier 1 | Add prompt caching via `cache_control: { type: "ephemeral" }`. | action |
| 3 | Tier 1 | Add prompt-caching beta header to provider request. | action |
| 4 | Tier 2 | Pack multiple blocks into one API call. | action |
| 5 | Tier 2 | Compute context budget (`context_limit - system - tool - output_reserve`). | constraint |
| 6 | Tier 2 | Tool schema returns array of per-block results. | action |
| 7 | Tier 2 | Split into adaptive batches and call once per batch. | action |
| 8 | Tier 2 | Treat output limits as practical cap for blocks per call. | constraint |
| 9 | Tier 2 | Practical batch size in 10-40 range depending on limits. | policy |
| 10 | Tier 3 | Use RAG over reference material instead of full prompt repetition. | action |
| 11 | Tier 3 | Chunk + embed reference corpus into vector index. | action |
| 12 | Tier 3 | Retrieve top-K relevant chunks per block/batch. | action |
| 13 | Tier 4 | Add Batch API async processing mode (submit + poll/webhook). | action |
| 14 | 4 / Architecture | Worker acts as MCP bridge between model tool calls and platform data. | action |
| 15 | 4 / Architecture | Worker connects to MCP server as client. | action |
| 16 | 4 / Architecture | Translate MCP tool definitions to provider-specific tool formats. | action |
| 17 | 4 / Architecture | Run multi-turn tool loop until final structured output. | action |
| 18 | 4 / MCP Tools | Support tools like `search_style_rules`, `get_block_batch`, `get_schema_for_block_type`, `lookup_previous_results`. | action |
| 19 | 5 / Pre-filtering | Skip blocks that do not need processing (image/table/heading/code/empty conditions). | action |
| 20 | 6 / Model Routing | Route model by block complexity/type. | action |
| 21 | 6 / Model Routing | Two-pass approach: cheap classify then appropriate processing model. | action |
| 22 | 7 / Priority | Priority order: caching -> batching -> pre-filter -> Batch API -> routing -> MCP+RAG. | policy |
| 23 | 7 / Sequence | Phase 1 immediate caching. | action |
| 24 | 7 / Sequence | Phase 2 worker v2 batching + pre-filtering. | action |
| 25 | 7 / Sequence | Phase 3 MCP bridge + RAG + model routing. | action |
| 26 | 8 / Constraints | Output token limits require split/mitigation behavior. | constraint |
| 27 | 8 / Constraints | Cache TTL behavior must be managed operationally. | constraint |
| 28 | 8 / Constraints | RAG misses require mitigation/fallback strategy. | constraint |
| 29 | 8 / Constraints | Large-batch quality degradation requires benchmark tuning. | constraint |
| 30 | 8 / Constraints | Batch API latency requires dual mode (realtime + async). | constraint |

Non-actionable in this source:
- Numeric cost tables and reference calculation examples (analysis baseline, not direct implementation outputs).
- Context-window reference table (input parameters, not standalone tasks).

## Pass 2: Repo State Check

| Item # | Expected Output | Exists? | Location / Evidence | Notes |
|---|---|---|---|---|
| 1-9,23-24,26 | Prompt caching + adaptive batching baseline with overflow-aware split behavior | yes | `supabase/functions/worker/index.ts` (`anthropic-beta` at `:398,:495`; cache control at `:413,:510`; adaptive packs `:1012+`; split/retry `:1138+`) | Tier 1 and core Tier 2 are implemented. |
| 10-12,28 | Retrieval-backed context (RAG) | no | No retrieval/vector search logic found in `supabase/functions/worker/index.ts` or worker modules | Tier 3 retrieval path absent. |
| 13,30 | Async Batch API mode | no | No Batch API submit/poll/webhook flow found in `supabase/functions/worker/index.ts` | Tier 4 async path absent. |
| 14-18,25 | MCP bridge tool-loop architecture | no | No MCP client/bridge modules in `supabase/functions/worker/` | MCP bridge unimplemented in current worker path. |
| 19 | Deterministic pre-filter skip pipeline | no | No skip-rule branch for block types/content found in worker path | Pre-filtering still missing. |
| 20-21 | Complexity-based model routing | no | No two-pass or complexity routing logic found in worker path | Routing not implemented. |
| 22 | Priority ordering policy reflected in implementation status | partial | `scripts/benchmark-worker-*.ps1`, `scripts/logs/*worker-batching*` | Priority 1-2 evidence exists; later tiers pending. |
| 27 | Cache TTL operational handling | partial | Prompt caching enabled, but no explicit TTL prewarm/orchestration logic found | Constraint acknowledged but not fully operationalized. |
| 29 | Quality tuning benchmark coverage | partial | `scripts/benchmark-worker-batching.ps1`, `scripts/benchmark-worker-priority5-batching.ps1`, log files under `scripts/logs/` | Cost/perf benchmarks exist; broader quality regression contract still incomplete. |

## Pass 3: Draft

Draft plan written to:
- `dev-todos/implementation-plans/2026-0211-1635-complete-worker-token-optimization-architecture.md`

## Pass 4: Completeness Audit

| Item # | Covered By | Status |
|---|---|---|
| 1 | Rule 1 + Action 1 | covered |
| 2 | Rule 2 + Action 1 | covered |
| 3 | Rule 2 + Action 1 | covered |
| 4 | Rule 2 + Action 1 | covered |
| 5 | Rule 3 + Action 1 | covered |
| 6 | Rule 1 + Action 1 | covered |
| 7 | Rule 3 + Action 1 | covered |
| 8 | Rule 3 + Action 1 | covered |
| 9 | Action 1 | covered |
| 10 | Action 6 | covered |
| 11 | Action 6 | covered |
| 12 | Action 6 | covered |
| 13 | Rule 6 + Action 4 | covered |
| 14 | Rule 7 + Action 5 | covered |
| 15 | Action 5 | covered |
| 16 | Rule 7 + Action 5 | covered |
| 17 | Rule 7 + Action 5 | covered |
| 18 | Action 5 + Action 6 | covered |
| 19 | Rule 4 + Action 2 | covered |
| 20 | Rule 5 + Action 3 | covered |
| 21 | Rule 5 + Action 3 | covered |
| 22 | Action 1 + Action 2 + Action 3 + Action 4 + Action 5 + Action 6 | covered |
| 23 | Action 1 | covered |
| 24 | Action 1 + Action 2 | covered |
| 25 | Action 3 + Action 5 + Action 6 | covered |
| 26 | Rule 3 + Action 1 | covered |
| 27 | Rule 2 + Action 1 | covered |
| 28 | Rule 4 + Action 6 | covered |
| 29 | Action 7 | covered |
| 30 | Rule 6 + Action 4 | covered |

Result: 30/30 actionable items tracked. 0 missing. 0 invented actions.

## Pass 5: Guideline Compliance Check

- [x] Filename pattern compliant
- [x] Header fields complete
- [x] Included rules embedded in plan
- [x] Actions in 3-column table
- [x] Full-sentence action descriptions
- [x] Tangible outputs for every action
- [x] Action chain produces downstream work
- [x] Last action is final artifact
- [x] Completion logic has binary locks
- [x] No sign-off/governance process actions
- [x] No invented process-doc outputs
- [x] Vertical-slice scope coverage

Summary counts:
- Pass 1 actionable extracted: 30
- Covered: 30
- Orphans (non-actionable): 2
- Flagged vague: 0


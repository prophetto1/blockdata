# Inspect AI Gap Analysis Against Profile Contract

**Date:** 2026-03-27
**Status:** Analysis
**Input:** Profile contract (`2026-03-27-environment-and-runtime-profile-contract.md`) compared against local Inspect AI reference (`_agchain/_reference/inspect_ai/`)

## Purpose

Profile-by-profile comparison of what Inspect AI provides versus what our contract assumes. For each profile, this document identifies what Inspect covers, what it does not, what our contract should absorb from Inspect, and what must remain AGChain-owned.

---

## Profile 1: Build Pipeline

**Inspect AI coverage:** None.

Inspect has no build-time concept. It consumes datasets, not sealed bundles. There is no equivalent of RP Builder, EU Builder, or Benchmark Builder.

**Contract impact:** None. This profile is entirely AGChain-owned and the contract is correct as written.

---

## Profile 2: Sealed Bundle

**Inspect AI coverage:** None.

Inspect loads datasets from files, HuggingFace, or CSV. It has no manifest, no signature verification, and no concept of sealed artifacts. The closest thing is `Sample.files` (a `dict[str, str]` mapping filenames to content or paths), but that is per-sample file provisioning, not a sealed bundle.

**Contract impact:** None. Correct as written.

**One addition worth noting:** Inspect's `EvalSpec.revision` tracks git commit + dirty state for provenance. Our Sealed Bundle profile should consider recording the git commit of the build pipeline that produced the bundle, not just the Ed25519 signature. This is a minor addition to the contract's provenance story.

---

## Profile 3: Runner Staging

**Inspect AI coverage:** Partial — through `SandboxEnvironment` and `Sample.files`.

What Inspect provides:
- `Sample.files: dict[str, str]` — files provisioned into the sandbox per sample
- `Sample.setup: str` — setup script run after file injection
- `SandboxEnvironment.write_file()` / `read_file()` — file I/O within sandbox
- Per-sample lifecycle: `sample_init()` → inject files → execute → `sample_cleanup()`
- `LocalSandboxEnvironment` uses a `tempfile.TemporaryDirectory` per sample (created on init, cleaned up on sample completion)

What Inspect does NOT provide:
- Payload admission control (which files are visible at which step)
- Step-scoped staging (Inspect provisions all `Sample.files` at sample start, not per-step)
- SHA-256 hashing of staged files before model call
- Audit logging of what was staged

**Contract impact — must modify:**

Our contract says staging is per-step. Inspect provisions files per-sample (once, at sample start). These are incompatible models for multi-step chains where evidence is admitted incrementally.

**Resolution:** AGChain's `StagingManager` must continue to own per-step file selection and hashing. The integration pattern is:
1. AGChain decides which files are admitted for the current step (PayloadGate)
2. AGChain hashes those files (AuditBoundary)
3. AGChain passes only the admitted files as `Sample.files` to Inspect for the per-step task
4. Inspect handles the sandbox file injection lifecycle

The contract's staging profile is correct but should explicitly note that Inspect's file injection is per-sample, not per-step, and AGChain bridges this gap by compiling one Inspect Sample per chain step.

---

## Profile 4: Candidate Execution

**Inspect AI coverage:** Strong — this is Inspect's core.

What Inspect provides:
- `Model.generate(input, tools, tool_choice, config)` → `ModelOutput`
- Retry with exponential backoff (tenacity: 3s initial, 30m max, ±3s jitter)
- Token accounting at three levels: per-call, per-sample, per-eval (via ContextVars)
- Cost calculation from `ModelCost` (input/output/cache rates per provider)
- Concurrency control via per-connection-key semaphore
- Cache support (read/write with policy)
- `ModelEvent` recording: input messages, tools, config, output, cache status, retries, timing

What Inspect does NOT provide:
- Structured window assembly (ENV → ANCHOR_PACK → EVIDENCE_PACK → CARRY_FORWARD → TASK → OUTPUT_GUARD)
- Payload-admission-aware message construction
- SHA-256 hash of final assembled message bytes
- Deterministic truncation policy that never truncates OUTPUT_GUARD

**Contract impact — must add:**

The contract should absorb these Inspect capabilities:

1. **Retry config:** Add `max_retries`, `timeout`, and backoff strategy to the `ProfileConstraints` model. Currently we only have `max_retries_per_step` and `timeout_per_step_seconds`. We should align naming with Inspect's `GenerateConfig` fields.

2. **Token accounting:** The contract mentions audit but not cost tracking. Add: "Token usage and cost are tracked per-step and per-run via Inspect's ModelUsage, aggregated into AGChain audit artifacts."

3. **Cache policy:** The contract does not mention caching. For benchmark fairness, caching must be explicitly disabled or controlled. Add an invariant: "Cache policy is recorded in run manifest. Default for benchmark runs is cache disabled."

4. **Concurrency control:** Inspect manages per-model concurrency via semaphores. The contract's `ProfileConstraints` should include `max_connections` (mapped to Inspect's `GenerateConfig.max_connections`).

**Must NOT change:** Window assembly, admission control, and message hashing remain AGChain-owned. The contract is correct on these.

---

## Profile 5: Judge Execution

**Inspect AI coverage:** Strong — via `model_roles`.

What Inspect provides:
- `init_model_roles({"eval": model_a, "judge": model_b})` sets role-based model routing
- `get_model(role="judge")` retrieves the judge model from context
- Per-role token accounting via `role_usage_context_var` (separate from per-model tracking)
- Judge model is a full `Model` instance with its own retry config, concurrency, and provider

What Inspect does NOT provide:
- Isolation enforcement (judge sees only rubric + candidate outputs)
- Prevention of judge seeing candidate transcript
- Score aggregation by runner (Inspect lets scorers return scores directly)

**Contract impact — must add:**

1. **Role names:** Lock the role vocabulary: `"evaluated"`, `"judge"`. The contract uses these implicitly but should state them explicitly for Inspect integration.

2. **Role-level usage tracking:** Add to audit behavior: "Token usage is tracked per-role (evaluated vs judge) via Inspect's role_usage, attached to AGChain audit artifacts per step."

**Must NOT change:** Isolation invariants (judge must not see transcript, ground truth) remain AGChain-owned. Inspect has no opinion on what the judge sees — that is composition-layer policy.

---

## Profile 6: Replay_Minimal (Session Strategy)

**Inspect AI coverage:** Indirect — Inspect's default is the opposite.

Inspect's native model is closer to Replay_Full: `TaskState.messages` is a growing list. Each `generate()` call appends the assistant response and tool results. Messages accumulate across the entire sample execution.

For Replay_Minimal (fresh API call per step), AGChain must:
1. NOT use Inspect's `TaskState.messages` accumulation across steps
2. Instead, compile a fresh Inspect `Sample` per chain step with only the admitted context
3. Each step is a separate Inspect task execution with its own `TaskState`

**Contract impact — must modify:**

The implementation plan (Task 4) says we wire the profile into `run_3s.py`. But the Inspect integration model requires a deeper architectural choice:

**Option A:** Each chain step = one Inspect `Task` + `Sample` execution. AGChain orchestrates the step sequence. This is the pattern recommended in the maximization analysis.

**Option B:** The entire chain = one Inspect `Task`, with a custom solver that implements step boundaries internally. This preserves Inspect's `TaskState` but requires AGChain to fight Inspect's message accumulation model.

Option A aligns with both the contract and the maximization analysis. The contract should explicitly state: "Each chain step compiles to one Inspect Sample + Task execution. The ChainExecutor orchestrates the step sequence above Inspect."

---

## Profile 7: Replay_Full (Session Strategy)

**Inspect AI coverage:** Native — this IS Inspect's default model.

`TaskState.messages` grows across the full sample execution. `task_generate()` appends assistant messages and tool results after each `generate()` call. This is exactly Replay_Full.

**What Inspect adds that the contract doesn't mention:**

1. **Compaction strategies** when messages exceed context window:
   - `CompactionAuto` — tries native provider compaction, falls back to summary
   - `CompactionNative` — delegates to provider API (OpenAI, Anthropic)
   - `CompactionSummary` — model-generated conversation summary
   - `CompactionEdit` — removes old tool results and reasoning blocks
   - `CompactionTrim` — keeps percentage of messages
   - Threshold: absolute token count or percentage of context window (default 0.9)
   - Up to 3 compaction iterations before failing
   - Baseline token calibration from actual API usage (most accurate counting)

2. **Memory tool** — model can save notes before compaction via `memory()` tool

**Contract impact — must add:**

The contract's Replay_Full profile is too thin. It should include:

1. **Compaction strategy selection:** Add `compaction_strategy` field to the composed profile object: `auto | native | summary | edit | trim | none`. Default: `none` for benchmark runs (to preserve determinism). If compaction is used, the strategy and threshold must be recorded in the run manifest.

2. **Compaction audit:** Add invariant: "If compaction is applied, a CompactionEvent is emitted and the pre/post compaction message hashes are recorded in audit_log.jsonl."

3. **Memory tool interaction:** If Replay_Full + tools are combined, the `memory()` tool creates a privileged save mechanism. The contract should note: "The Inspect `memory` tool, if enabled, interacts with compaction by preserving model-saved notes. For benchmark runs, this must be an explicit profile choice, not an implicit default."

---

## Profile 8: Type 0 — Serialized State

**Inspect AI coverage:** Partial — via `TaskState.store`.

Inspect provides `TaskState.store: dict[str, Any]` as a shared key-value store accessible to all solvers and scorers within a sample execution. It persists for the sample's lifetime.

**Key difference:** `TaskState.store` is unstructured and unsanitized. AGChain's `candidate_state.json` is sanitized (forbidden keys stripped) and keyed by step_id.

**Contract impact:** None. The contract correctly identifies Type 0 as AGChain-owned. The implementation wraps `CandidateState` as a registered state provider, not `TaskState.store`. No change needed.

**Note for implementation:** If using Option A (one Inspect Task per step), `TaskState.store` resets each step. AGChain's `CandidateState` carries forward across steps above Inspect's per-task boundary. This is the correct layering.

---

## Profiles 9-11: Type I, II, III State Providers

**Inspect AI coverage:** Minimal.

- Type I (Pinned Context): No equivalent. Inspect has no mutable system message block concept.
- Type II (Session Context Manager): `CompactionSummary` is the closest — it summarizes conversation history. But it is reactive (triggered by overflow), not proactive (runner-managed between steps).
- Type III (Temporal Fact Store): No equivalent. Inspect has no validity-scoped assertion store.

**Contract impact:** None. These are correctly identified as AGChain-owned and Planned. No changes needed.

**Note:** When implementing Type II, consider whether `CompactionSummary` can be reused as a sub-component. AGChain could invoke Inspect's summary compaction to generate a session summary between steps, then inject the result as a CARRY_FORWARD window. This is a "wrapped InspectAI capability" pattern.

---

## Profile 12: No Tools

**Inspect AI coverage:** Full — via `tool_choice="none"` or simply not providing tools.

If no tools are passed to `Model.generate()`, the model receives no tool definitions. If `tool_choice="none"` is set, the model is instructed not to call tools even if definitions are present.

**Contract impact:** None. Correct as written.

---

## Profile 13: Standard Tool Set

**Inspect AI coverage:** Full — via `@tool` decorator and `use_tools()` solver.

What Inspect provides:
- `@tool` decorator for defining tools with typed parameters, descriptions, and JSON Schema
- `ToolDef` — complete tool specification (name, description, parameters, parallel flag, viewer, model_input)
- `use_tools(*tools, tool_choice="auto")` solver — injects tools into `TaskState`
- `execute_tools()` — parallel tool execution with error handling cascade
- Built-in tools: `bash`, `python`, `bash_session`, `web_browser`, `web_search`, `computer`, `code_execution`, `text_editor`, `memory`, `think`, `update_plan`, `skill`
- Tool output truncation (default 16KB)
- Tool result injection back into conversation as `ChatMessageTool`

**Error handling cascade:**
- `TimeoutError` → `ToolCallError("timeout")`
- `PermissionError` → `ToolCallError("permission")`
- `FileNotFoundError` → `ToolCallError("file_not_found")`
- `OutputLimitExceededError` → `ToolCallError("limit")`
- `ToolApprovalError` → `ToolCallError("approval")`
- `ToolParsingError` → `ToolCallError("parsing")`
- All recoverable errors feed back to model as error messages

**Contract impact — must add:**

1. **Tool output truncation:** Add to profile: "Tool output is truncated to `max_output` bytes (default 16KB via Inspect). Truncation events are recorded."

2. **Parallel execution flag:** Add: "Each tool declares whether it supports parallel execution. The platform respects this flag."

3. **Error recovery model:** Add: "Tool errors are recoverable by default — the model receives the error and can retry or proceed. Fatal exceptions (limits exceeded) terminate the sample."

4. **Built-in tool inventory:** The contract says "predefined set of tools (calculator, code interpreter, etc.)" which is vague. Replace with: "Inspect provides built-in tools: `bash`, `python`, `web_browser`, `web_search`, `computer`, `code_execution`, `text_editor`. AGChain selects which subset to expose per profile."

---

## Profile 14: MCP Server Access

**Inspect AI coverage:** Full — via `mcp_tools()` ToolSource.

What Inspect provides:
- `mcp_tools(server, tools="all" | ["glob_pattern"])` — converts MCP tools to Inspect tools
- `MCPServer` — abstract server type with stdio/HTTP/SSE/sandbox variants
- Lazy tool discovery: `server.tools()` called on first access, cached
- Glob-based tool filtering via `fnmatch`
- Local and remote MCP server support
- Per-task MCP session lifecycle

**Contract impact — must add:**

1. **Tool filtering:** Add: "MCP tool exposure is filtered via glob patterns (e.g., `['search*', 'read_*']`). The filter set is part of the profile configuration and recorded in the run manifest."

2. **Server lifecycle:** Add: "MCP server connections are per-task (not per-step). For multi-step chains using Option A (one Inspect Task per step), the MCP connection may be re-established each step. This is acceptable for stateless MCP servers but may not work for stateful ones."

---

## Profile 15: Sandbox Execution

**Inspect AI coverage:** Full — this is Inspect's core execution isolation layer.

What Inspect provides:
- `SandboxEnvironment` ABC with 4 abstract methods: `exec`, `write_file`, `read_file`, `sample_cleanup`
- `@sandboxenv(name="docker")` registration decorator
- Built-in implementations: `local` (tempdir), `docker` (compose-based)
- Plugin packages: `k8s`, `ec2`, `proxmox`, `modal`, `daytona`
- Per-sample lifecycle: `task_init()` → `sample_init()` → (execute) → `sample_cleanup()` → `task_cleanup()`
- Output limits: 10 MiB per exec stream, 100 MiB per file read
- Streaming execution via `exec_remote()` with `ExecStdout | ExecStderr | ExecCompleted` events
- RPC bridge via `sandbox_service()` for running async callbacks inside sandbox
- Concurrency control: `default_concurrency()` returns max parallel sandboxes (Docker: 2 × CPU count)
- Connection info for IDE integration (`SandboxConnection`)
- `sandbox_with()` — find sandbox containing a specific file
- Event recording via `SandboxEnvironmentProxy` (wraps all operations)

**Contract impact — must modify:**

The contract's Sandbox profile is too thin. It should include:

1. **Output limits:** Add: "Sandbox exec output is limited to 10 MiB per stream. File reads are limited to 100 MiB. These are Inspect defaults. AGChain may tighten them per profile."

2. **Concurrency:** Add: "Sandbox concurrency is limited by the provider (Docker default: 2 × CPU count). The profile may specify `max_sandboxes` to override."

3. **Registration pattern:** Add: "New sandbox types are registered via `@sandboxenv(name=...)` decorator. AGChain does not create custom sandbox types in this phase — it uses Inspect's built-in `local` and `docker` providers."

4. **Streaming execution:** Add: "Long-running tool executions use Inspect's `exec_remote()` streaming interface, emitting stdout/stderr events incrementally."

---

## Cross-Cutting: Logging and Audit

**Inspect AI provides a rich logging system that the contract underspecifies.**

### EvalLog (per-run)
- `status`: started / success / cancelled / error
- `eval: EvalSpec` — task identity, model, dataset, git revision
- `plan: EvalPlan` — solvers and config used
- `results: EvalResults` — scores and metrics
- `stats: EvalStats` — model_usage and role_usage aggregates
- `error: EvalError` — halting error with traceback

### EvalSample (per-sample)
- `messages: list[ChatMessage]` — complete conversation
- `scores: dict[str, Score]` — all scores
- `model_usage` / `role_usage` — token tracking
- `events: list[Event]` — full event transcript (19 event types)
- `started_at` / `completed_at` / `total_time` / `working_time`
- `limit: EvalSampleLimit` — what halted the sample (context/time/token/cost/etc.)
- `error` / `error_retries` — errors with retries

### 19 Event Types
- `SampleInitEvent`, `SampleLimitEvent`
- `ModelEvent` (input, output, tools, cache, retries, timing)
- `ToolEvent`, `SandboxEvent`, `ApprovalEvent`
- `ScoreEvent` (with cumulative usage at scoring time)
- `StateEvent`, `StoreEvent`, `StepEvent`, `SubtaskEvent`
- `SpanBeginEvent`, `SpanEndEvent`
- `InputEvent`, `LoggerEvent`, `InfoEvent`, `ErrorEvent`
- `CompactionEvent`, `ScoreEditEvent`

### Score Provenance
- `Score.history: list[ScoreEdit]` — full edit chain with author, timestamp, reason
- `EvalSample.invalidation: ProvenanceData` — per-sample invalidation
- `EvalLog.log_updates: list[LogUpdate]` — post-eval edits

**Contract impact — must add a new section:**

The contract should add an **Audit Integration** section that specifies how AGChain's audit artifacts relate to Inspect's logging:

```
AGChain audit artifacts (canonical):
  - audit_log.jsonl — staged file hashes, message hashes, admission records
  - run.jsonl — per-step results ledger
  - candidate_state.json — final sanitized state
  - run_manifest.json — provenance snapshot
  - summary.json — score rollups

Inspect logging artifacts (attached supporting evidence):
  - EvalLog — per-task execution record
  - EvalSample — per-sample record with full event transcript
  - ModelEvent stream — every model call with input/output/usage
  - ToolEvent stream — every tool invocation with result/timing
  - ScoreEvent stream — every scoring action

Integration rule:
  AGChain audit_log.jsonl remains the canonical proof of what the candidate saw.
  Inspect EvalLog and events are attached as supporting execution evidence.
  Both must be present for a run to be considered fully auditable.
```

---

## Composed Profile Object — Required Changes

The contract defines:

```
profile:
  id, name, version
  session_strategy: replay_minimal | replay_full
  state_provider: type_0 | type_i | type_ii | type_iii
  tool_strategy: no_tools | standard | mcp
  sandbox: SandboxEnvironmentSpec | null
  constraints:
    max_tokens_per_step, max_cost_per_run, max_retries_per_step, timeout_per_step_seconds
```

Based on the Inspect AI analysis, this should expand to:

```
profile:
  id, name, version
  session_strategy: replay_minimal | replay_full
  state_provider: type_0 | type_i | type_ii | type_iii
  tool_strategy: no_tools | standard | mcp
  tool_filter: list[str] | null          # glob patterns for tool selection
  sandbox: SandboxEnvironmentSpec | null
  compaction: auto | native | summary | edit | trim | none   # NEW
  compaction_threshold: float | null      # NEW (0.0-1.0 = % of context, >1 = absolute tokens)
  cache_policy: disabled | read | write | read_write          # NEW
  constraints:
    max_tokens_per_step: int | null
    max_cost_per_run: float | null
    max_retries_per_step: int             # maps to GenerateConfig.max_retries
    timeout_per_step_seconds: int         # maps to GenerateConfig.timeout
    max_connections: int | null           # NEW — maps to GenerateConfig.max_connections
    max_tool_output: int | null           # NEW — tool output truncation (default 16384)
    max_sandboxes: int | null             # NEW — concurrent sandbox limit
```

---

## Implementation Plan — Required Changes

The current implementation plan creates profile types in `_agchain/profiles/`. Based on this analysis:

### Task 1 (Profile types) — expand Pydantic models

Add fields: `compaction`, `compaction_threshold`, `cache_policy`, `tool_filter`, `max_connections`, `max_tool_output`, `max_sandboxes`.

### Task 2 (Strategy Protocols) — no change

Session and state provider protocols are AGChain-owned. Inspect does not change them.

### Task 3 (Registry) — no change

Registry pattern is AGChain-owned.

### Task 4 (Wire into run_3s.py) — must revise

The current plan says: "Replace direct `build_messages()` call with `resolved_profile.session_strategy.init_messages()`."

This is correct for the pre-Inspect-integration phase. But the plan should note that the next phase (Inspect integration) will change the wiring to: "Compile each step into an Inspect Sample + Task, pass to Inspect for execution, harvest EvalLog."

### New Task 6 — baseline profile validation

Add a task that validates the baseline profile's composed fields map correctly to Inspect's `GenerateConfig`:
- `max_retries_per_step` → `GenerateConfig.max_retries`
- `timeout_per_step_seconds` → `GenerateConfig.timeout`
- `max_connections` → `GenerateConfig.max_connections`
- `cache_policy` → `GenerateConfig.cache` (boolean or CachePolicy)
- `compaction` → `GenerateConfig.max_tokens` (threshold triggers compaction)

This mapping must be tested to ensure the profile's constraints are correctly forwarded to Inspect when the integration phase begins.

---

## Summary: What Changes

| Profile | Verdict | Key Change |
|---------|---------|-----------|
| 1. Build Pipeline | No change | — |
| 2. Sealed Bundle | Minor add | Add git commit to provenance |
| 3. Runner Staging | Clarify | Note Inspect is per-sample; AGChain bridges per-step |
| 4. Candidate Execution | Add fields | Retry config, token/cost tracking, cache policy, concurrency |
| 5. Judge Execution | Add fields | Lock role names, role-level usage tracking |
| 6. Replay_Minimal | Clarify | Explicitly state "one Inspect Task per chain step" |
| 7. Replay_Full | Significant add | Compaction strategy, threshold, memory tool interaction |
| 8. Type 0 | No change | — |
| 9-11. Type I-III | No change | — |
| 12. No Tools | No change | — |
| 13. Standard Tools | Add details | Output truncation, parallel flag, error model, built-in inventory |
| 14. MCP Tools | Add details | Glob filtering, server lifecycle |
| 15. Sandbox | Expand | Output limits, concurrency, registration, streaming |
| Composed object | Expand | 6 new fields |
| Audit integration | New section | Relationship between AGChain and Inspect artifacts |

## Top Risk

The architectural choice of "one Inspect Task per chain step" (Option A) versus "one Inspect Task per chain" (Option B) is the most consequential decision not yet locked. The contract and maximization analysis both lean toward Option A, but it has not been validated against the actual Inspect `task_run` lifecycle. Specifically: does creating and destroying Inspect Tasks per step impose unacceptable overhead (sandbox teardown/setup, model connection re-establishment, MCP session restart)? This must be benchmarked before the integration phase begins.

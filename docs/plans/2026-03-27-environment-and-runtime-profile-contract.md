# Environment and Runtime Profile Contract

**Date:** 2026-03-27
**Status:** Draft

> **Authority:** Secondary schema/modeling companion. The primary runtime/environment contract is `2026-03-27-runtime-and-environment-contract-inventory.md`. This document provides the configuration shape and selectable modes; it does not override the flat inventory's ownership or invariant declarations.
**Source of truth:** `_agchain/legal-10/docs/_essentials/`

## Purpose

Define every profile the AGChain platform needs for benchmark build, execution, and comparison. Each profile is listed flat with applicable fields. No grouping hierarchy is imposed.

The platform's core insight is: **"which runtime policy makes this model strongest."** The comparison matrix is `Benchmark (fixed) x Model (fixed) x Profile (varied)`. These profiles are the third axis.

## Developer Env Ownership

Repo-root `E:\writing-system\.env` is the only developer-owned local env file for this workspace, and [`.env.example`](/e:/writing-system/.env.example) is the committed key inventory.

`_agchain` does not define a separate local runtime boundary today, so it should not carry its own private `.env`. Provider and MCP-related variables may still be used by `_agchain` reference material or tools, but they resolve from the root env surface or the parent process environment. If `_agchain` later becomes independently executable, add an intentional `_agchain/.env.example` tied to that runtime.

---

## Profile List

### 1. Build Pipeline

- **Purpose:** Transform raw data sources into sealed benchmark assets (RPs, EUs, benchmark packets).
- **Phase:** Build-time.
- **Inputs:** DuckDB (`legal10-updates.duckdb`), raw datasets (`scdb_full_with_text.jsonl`, `cap_citations_ranked.jsonl`, `scotus_citations_ranked.jsonl`, `citation_inventory.parquet`, `casesumm_syllabi.parquet`, `cap_head_matter.jsonl`), build configs, seed values.
- **Outputs:** Research packs (`rps/rpv1__<caseId>/`), evaluation units (`eus/<eu_id>/p1.json, p2.json, ground_truth.json`), benchmark packets (`benchmark/benchmark.json, plan.json, model_steps/*, judge_prompts/*`).
- **Invariants:**
  - Determinism: same inputs + seed produces byte-identical outputs.
  - No network calls.
  - All JSON written with stable key ordering and `\n` line endings.
  - Ground truth computed from DuckDB, not invented.
- **Ownership:** AGChain-owned.
- **Status:** Active. Builders exist: `scripts/rp_builder.py`, `scripts/eu_builder.py`, `runspecs/3-STEP-RUN/benchmark_builder.py`.

---

### 2. Sealed Bundle

- **Purpose:** Immutable, signed package of benchmark assets that the runner can verify before execution.
- **Phase:** Build-time artifact (bridge between build and runtime).
- **Inputs:** Complete benchmark packet + all EU packets from Build Pipeline.
- **Outputs:** `manifest.json` (SHA-256 inventory of every file), `signature.json` (Ed25519 detached signature over manifest bytes).
- **Invariants:**
  - Runner refuses to execute if any file differs from manifest.
  - Runner refuses to execute if signature verification fails.
  - Manifest excludes itself and `signature.json`.
  - Manifest uses normalized forward-slash relative paths.
- **Ownership:** AGChain-owned.
- **Status:** Defined in M1 dev brief. Implementation in progress.

---

### 3. Runner Staging

- **Purpose:** Per-step file isolation directory that enforces the no-leak envelope.
- **Phase:** Runtime.
- **Inputs:** Current step file, admitted payloads per `plan.json`, sanitized `candidate_state.json`.
- **Outputs:** `staging/{run_id}/{call_id}/` directory containing only admitted files.
- **Staging/isolation behavior:** Only files explicitly admitted for the current step are copied. Ground truth, judge prompts, future steps, unadmitted payloads, and other EUs' data are never staged.
- **Audit/provenance behavior:** All staged files are SHA-256 hashed before the model call. Hashes recorded in `audit_log.jsonl`.
- **Invariants:**
  - Staging directory created before each step, deleted after.
  - Candidate cannot access anything outside staging.
  - No file enters staging without explicit admission in `plan.json`.
- **Ownership:** AGChain-owned.
- **Status:** Active.

---

### 4. Candidate Execution

- **Purpose:** The execution context visible to the evaluated model during a benchmark step.
- **Phase:** Runtime.
- **Inputs:** Assembled `messages[]` array built from staged files.
- **Outputs:** Model response (raw text), token usage, latency.
- **Model-role behavior:** Evaluated model only. Separate from judge. Model target is configurable (provider, model_id, endpoint).
- **Statefulness behavior:** Determined by the session strategy (Replay_Minimal or Replay_Full) and state provider (Type 0-III) selected for the run.
- **Payload-admission behavior:** Cumulative. Payloads admitted per `plan.json` `inject_payloads`. Once admitted, a payload remains visible for subsequent steps.
- **Staging/isolation behavior:** Model sees only staged bytes assembled into structured windows in fixed order: `ENV` -> `ANCHOR_PACK` -> `EVIDENCE_PACK` -> `CARRY_FORWARD` -> `TASK` -> `OUTPUT_GUARD`.
- **Audit/provenance behavior:** Final message bytes SHA-256 hashed. Response bytes hashed. Both recorded in `audit_log.jsonl`. Supports "what did the candidate see?" verification.
- **Invariants:**
  - Never sees ground truth, judge prompts, future steps, or other EUs.
  - `OUTPUT_GUARD` window is never truncated.
  - Truncation of payload/state windows is deterministic and logged.
- **Ownership:** AGChain-owned (message assembly, admission, audit). InspectAI-backed (model call, retries, token accounting).
- **Status:** Active (AGChain policy). Planned (Inspect model call integration).

---

### 5. Judge Execution

- **Purpose:** Isolated execution context for the judge model that grades candidate outputs.
- **Phase:** Runtime.
- **Inputs:** Judge rubric prompt (`judge_prompts/*.json`) + candidate outputs being graded.
- **Outputs:** Per-component scores, grading details, judge output JSON.
- **Model-role behavior:** Judge model only. Separate provider/model_id from evaluated model. Uses Inspect `model_roles` for separation.
- **Statefulness behavior:** None. Each judge call is stateless. No carry-forward.
- **Payload-admission behavior:** Judge sees only rubric + candidate outputs. Never candidate transcript, ground truth, or prior judge outputs.
- **Staging/isolation behavior:** Judge prompt and candidate outputs are staged separately. No access to candidate session state.
- **Audit/provenance behavior:** Judge output recorded as separate record in `run.jsonl` with `grades_step_ids`. Component scores aggregated by runner, not judge.
- **Invariants:**
  - Judge must not see candidate transcript.
  - Judge must not see ground truth.
  - Score aggregation is runner-owned.
- **Ownership:** AGChain-owned (isolation rules, score aggregation). InspectAI-backed (model call).
- **Status:** Active.

---

### 6. Replay_Minimal (Session Strategy)

- **Purpose:** Fresh API call per step. Continuity exists only through runner-injected windows.
- **Phase:** Runtime.
- **Statefulness behavior:** Hard cut between steps. Each step starts with a fresh `messages[]`. Prior context is available only through `CARRY_FORWARD` window (from `candidate_state.json`) and re-injected payload windows.
- **Payload-admission behavior:** Payloads re-injected from staging into structured windows at each step.
- **Audit/provenance behavior:** Each step's assembled message bytes are independently hashable and verifiable.
- **Invariants:**
  - Model cannot access prior API calls or provider-side session history.
  - All context is explicitly constructed by the runner.
  - Must yield identical admissibility proofs as Replay_Full.
- **Ownership:** AGChain-owned.
- **Status:** Active (baseline for 3-step MVP).

---

### 7. Replay_Full (Session Strategy)

- **Purpose:** Growing message history within an EU. Admission-gated.
- **Phase:** Runtime.
- **Statefulness behavior:** Runner maintains a growing `messages[]` list for the EU. New step messages are appended. History grows across steps.
- **Payload-admission behavior:** Same `plan.json` rules. Runner guarantees unadmitted evidence never appears in message history.
- **Audit/provenance behavior:** Full transcript is hashable. Must yield identical admissibility proofs as Replay_Minimal.
- **Invariants:**
  - Unadmitted evidence never appears in growing history.
  - EU-scoped. No cross-EU history.
  - Same audit proof requirements as Replay_Minimal.
- **Ownership:** AGChain-owned.
- **Status:** Defined in statefulness doc. Not yet implemented.

---

### 8. Type 0: Serialized State (State Provider)

- **Purpose:** Inter-step persistence of model-derived artifacts via JSON file carry-forward.
- **Phase:** Runtime.
- **Inputs:** Parsed model output from current step.
- **Outputs:** Updated `candidate_state.json` keyed by `step_id`.
- **Statefulness behavior:** State accumulates: each step adds, never removes. JSON-serializable. Sanitized: no ground truth, scores, judge outputs, or runner internals.
- **Audit/provenance behavior:** `candidate_state.json` is staged and hashed at each step boundary. Final state snapshot written to run artifacts.
- **Invariants:**
  - Forbidden keys stripped recursively: `ground_truth`, `score`, `judge_*`, `gt_`, `rubric`.
  - EU-scoped. No cross-EU state.
  - Serializable for audit reproducibility.
- **Ownership:** AGChain-owned.
- **Status:** Active (baseline).

---

### 9. Type I: Pinned Context (State Provider)

- **Purpose:** Persistent runner-controlled invariants (goal, mode, constraints) pinned in the system message.
- **Phase:** Runtime.
- **Inputs:** Run-level metadata, hashes, runner configuration.
- **Outputs:** Mutable block inside the system message.
- **Statefulness behavior:** Reserved mutable block in system message updated by the runner between steps. Contains instructions and run-level metadata. Does NOT contain candidate evidence (anchor text stays in payload windows).
- **Audit/provenance behavior:** Pinned context block is part of the hashed message bytes.
- **Invariants:**
  - Evidence belongs in payload windows, not pinned context.
  - Runner-controlled. Model does not write to it.
  - Serializable and auditable.
- **Ownership:** AGChain-owned. Reference: Letta pattern.
- **Status:** Planned.

---

### 10. Type II: Session Context Manager (State Provider)

- **Purpose:** Offload and recover EU-local session history to manage context limits without breaking isolation.
- **Phase:** Runtime.
- **Inputs:** Session history, context window limits.
- **Outputs:** Summarized or retrieved context re-injected into candidate messages.
- **Statefulness behavior:** Runner-managed summarization and retrieval. Any content reintroduced to the candidate is serializable, auditable, and EU-scoped.
- **Audit/provenance behavior:** Summarized content logged and hashed when re-injected.
- **Invariants:**
  - EU-scoped. No cross-EU information.
  - All re-injected content is auditable.
  - Runner-controlled. Model does not request updates.
- **Ownership:** AGChain-owned. Reference: Zep pattern. Inspect compaction is a sub-feature, not a replacement.
- **Status:** Planned.

---

### 11. Type III: Temporal Fact Store (State Provider)

- **Purpose:** Store assertions with validity windows (`valid_from` / `valid_to`) to resolve contradictions over time.
- **Phase:** Runtime.
- **Inputs:** Runner-extracted assertions from model outputs.
- **Outputs:** Facts queried by validity window, delivered as an admitted payload.
- **Statefulness behavior:** Runner-managed temporal store. Facts are EU-scoped. Candidate-visible facts must be admitted like a payload (explicit window + audit logging).
- **Audit/provenance behavior:** All admitted facts logged with validity windows.
- **Invariants:**
  - EU-scoped.
  - Admission-gated like any other payload.
  - Runner-controlled.
- **Ownership:** AGChain-owned. Reference: GraphRAG/Memento pattern.
- **Status:** Planned.

---

### 12. No Tools (Tool Strategy)

- **Purpose:** Prompt-only execution. Model receives only prompt context, zero tool access.
- **Phase:** Runtime.
- **Inputs:** Assembled messages only.
- **Outputs:** Model text response only.
- **Invariants:**
  - No tool calls permitted.
  - No external access.
  - Simplest audit surface.
- **Ownership:** AGChain-owned (policy). Enforced by not providing tools to Inspect task.
- **Status:** Active (baseline for 3-step MVP).

---

### 13. Standard Tool Set (Tool Strategy)

- **Purpose:** Predefined set of tools (calculator, code interpreter, etc.) available to the evaluated model.
- **Phase:** Runtime.
- **Inputs:** Tool definitions registered for the benchmark domain.
- **Outputs:** Tool call results injected back into model context.
- **Audit/provenance behavior:** Every tool invocation and result captured in audit log. Tool access scoped per-step.
- **Invariants:**
  - Tool access must not bypass payload admission controls.
  - Tool usage is policy-controlled and explicit.
  - All tool calls auditable.
- **Ownership:** AGChain-owned (policy, audit). InspectAI-backed (tool execution: `Tool`, `ToolDef`, `use_tools`, `execute_tools`).
- **Status:** Planned.

---

### 14. MCP Server Access (Tool Strategy)

- **Purpose:** Model connects to MCP servers for tool discovery and invocation.
- **Phase:** Runtime.
- **Inputs:** MCP server configuration, approval policies.
- **Outputs:** MCP tool call results.
- **Audit/provenance behavior:** MCP tool calls recorded in audit log. Approval policies enforce access boundaries.
- **Invariants:**
  - Same audit requirements as standard tools.
  - Approval policies required.
  - Must not bypass benchmark visibility controls.
- **Ownership:** AGChain-owned (policy, approval rules). Delegated to InspectAI (MCP dispatch: `tool/_mcp/`).
- **Status:** Planned.

---

### 15. Sandbox Execution

- **Purpose:** Isolated execution environment for tool calls and untrusted code.
- **Phase:** Runtime.
- **Inputs:** `SandboxEnvironmentSpec`, `Sample.files`, `Sample.setup`.
- **Outputs:** Tool execution results, file outputs.
- **Staging/isolation behavior:** Per-sample lifecycle: provision, inject files, execute, cleanup. Cross-EU isolation enforced.
- **Audit/provenance behavior:** Sandbox events captured in Inspect `EvalLog` and attached to AGChain audit artifacts.
- **Invariants:**
  - Per-sample lifecycle.
  - No cross-EU information leakage.
  - Sandbox type is pluggable (Docker built-in, extensible to K8s).
- **Ownership:** Delegated to InspectAI (`SandboxEnvironment` ABC, registry). AGChain stages files for audit before passing to Inspect.
- **Status:** Planned.

---

## Composed Profile Object

A run is configured by selecting one session strategy + one state provider + one tool strategy. The composed object:

```
profile:
  id: string
  name: string
  version: string
  session_strategy: replay_minimal | replay_full
  state_provider: type_0 | type_i | type_ii | type_iii
  tool_strategy: no_tools | standard | mcp
  sandbox: SandboxEnvironmentSpec | null
  constraints:
    max_tokens_per_step: int | null
    max_cost_per_run: float | null
    max_retries_per_step: int
    timeout_per_step_seconds: int
```

The baseline 3-step MVP profile is: `replay_minimal + type_0 + no_tools + no sandbox`.

---

## Capability Mapping

| Capability | Ownership |
|---|---|
| Build pipeline (RP/EU/benchmark builders) | Owned by AGChain |
| Bundle sealing (manifest + signature) | Owned by AGChain |
| Payload admission control | Owned by AGChain |
| Structured window assembly | Owned by AGChain |
| Candidate state sanitization | Owned by AGChain |
| Session strategy selection | Owned by AGChain |
| State provider management (Type 0-III) | Owned by AGChain |
| Audit proof (staged-bytes + message hashing) | Owned by AGChain |
| Profile identity and versioning | Owned by AGChain |
| Fairness enforcement (same profile for all models in a run) | Owned by AGChain |
| Score aggregation | Owned by AGChain |
| Model resolution and provider execution | Wrapped InspectAI capability |
| Model roles (evaluated vs judge) | Wrapped InspectAI capability |
| Task execution lifecycle (retries, limits) | Wrapped InspectAI capability |
| Context compaction (overflow management) | Wrapped InspectAI capability |
| Tool execution pipeline | Wrapped InspectAI capability |
| Approval policies for tool access | Wrapped InspectAI capability |
| MCP tool dispatch | Delegated to InspectAI |
| Sandbox environment lifecycle | Delegated to InspectAI |
| Eval logging and event timeline | Delegated to InspectAI |
| Sample/dataset abstraction | Delegated to InspectAI |
| Internet access tool strategy | Not in current scope |
| Database access tool strategy | Not in current scope |
| Full autonomy tool strategy | Not in current scope |
| RAG-injected context strategy | Not in current scope |
| Persistent local context (OpenClaw pattern) | Not in current scope |

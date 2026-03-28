# Runtime And Environment Contract Consolidation Implementation Plan

**Goal:** Consolidate the competing March 27 runtime/environment docs into one implementation-driving contract, then introduce a runtime configuration and execution-backend seam in the Legal-10 3-step runner that preserves AGChain semantics and can later wrap `inspect_ai` safely.

**Architecture:** The existing Legal-10 runtime remains the semantic owner of payload admission, staged window assembly, candidate state sanitization, staging isolation, and canonical audit proof. The live implementation seam is the current 3-step runner in `_agchain/legal-10/runspecs/3-STEP-RUN/`. The first code phase does not replace the runner. It formalizes its runtime contract and inserts a backend boundary so the current direct API adapters remain the default path and a future `inspect_ai` backend can be introduced behind the same contract.

**Tech Stack:** Markdown docs, Python 3.10+, `pytest`, existing Legal-10 runner modules, optional lazy `inspect_ai` import in a guarded backend module.

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-27

---

## Manifest

### Platform API

No platform API changes. This work is confined to docs and the offline Legal-10 runner under `_agchain/legal-10/runspecs/3-STEP-RUN/`.

### Observability

No OpenTelemetry or service-level observability changes. There **are** runtime artifact changes in the benchmark runner:

- record the resolved runtime config in the run-level artifact set
- distinguish canonical AGChain audit artifacts from supporting execution logs
- allow optional supporting log pointers for future `inspect_ai` eval/transcript/trace outputs without changing canonical audit ownership

### Database Migrations

No database changes.

### Edge Functions

No edge function changes.

### Frontend Surface Area

No frontend changes.

### Developer Env Ownership

The baseline direct-adapter path must continue to run without `inspect_ai` installed. Any future `inspect_ai` backend must use a lazy import and fail with a clear message if explicitly selected but not installed. Remote MCP and network-enabled sandbox modes remain default-off in this plan.

---

## Pre-Implementation Contract

No major decision may be improvised during implementation. If any item below changes, stop and revise this plan first.

### Locked Decisions

1. [2026-03-27-runtime-and-environment-contract-inventory.md](E:/writing-system/docs/plans/2026-03-27-runtime-and-environment-contract-inventory.md) becomes the primary runtime contract.
2. [2026-03-27-environment-and-runtime-profile-contract.md](E:/writing-system/docs/plans/2026-03-27-environment-and-runtime-profile-contract.md) becomes a secondary schema/modeling companion, not a competing authority.
3. [2026-03-27-inspect-ai-substrate-gap-analysis.md](E:/writing-system/docs/plans/2026-03-27-inspect-ai-substrate-gap-analysis.md) is the preferred InspectAI comparison memo.
4. [2026-03-27-inspect-ai-gap-analysis.md](E:/writing-system/docs/plans/2026-03-27-inspect-ai-gap-analysis.md) is retained only as exploratory analysis and must be marked superseded.
5. The live runtime seam is the existing runner and helper modules:
   - [run_3s.py](E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py)
   - [state.py](E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/state.py)
   - [input_assembler.py](E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/input_assembler.py)
   - [payload_gate.py](E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/payload_gate.py)
   - [audit.py](E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/audit.py)
   - [staging.py](E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/staging.py)
6. AGChain semantics remain in those runtime helpers. `inspect_ai` is introduced only as an execution substrate behind a backend interface.
7. The baseline runtime remains the current direct API path. No forced migration to `inspect_ai` in the first implementation pass.
8. Approval policy governs tool calls only. It must not be allowed to replace payload admission.
9. Supporting execution logs must remain distinct from canonical `audit_log.jsonl`.
10. Remote MCP and networked sandbox execution remain out of scope and disabled by default.

### Locked Acceptance Contract

Implementation is complete only when all of the following are true:

1. The flat inventory doc explicitly contains the missing InspectAI-facing seams:
   - Eval Runtime Config
   - Approval Policy
   - Sandbox Binding
   - Supporting Execution Logs
   - Tool Selection and MCP Selection
   - Runtime Limits
2. The flat inventory doc contains an explicit AGChain-to-InspectAI wrapper boundary section.
3. The profile contract doc is clearly marked as secondary or companion-only.
4. The exploratory InspectAI gap doc is clearly marked superseded.
5. The 3-step runner accepts a typed runtime config instead of relying only on implicit defaults.
6. The baseline runtime config reproduces current behavior with no semantic regression in payload admission, staged windows, candidate state, staging isolation, or audit proof.
7. A backend interface exists that supports the current direct adapters and a future InspectAI-backed path.
8. Supporting execution log pointers can be recorded without changing the canonical AGChain audit surface.
9. Tests cover config validation, baseline behavior selection, and audit/log separation.

---

## Locked Platform Surface

This plan creates no new API endpoints, no DB tables, no frontend routes, and no edge functions. The owned runtime seam is the offline Legal-10 runner only.

## Locked Observability Surface

The observability changes in scope are limited to benchmark artifacts written by the runner:

- `audit_log.jsonl` remains canonical
- run-level metadata must record the resolved runtime config
- optional supporting log fields may record InspectAI eval log, transcript, or trace paths when an InspectAI backend is used
- supporting log fields must never be required for baseline runs

---

## File Inventory

### New files: 5

| File | Purpose |
|------|---------|
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/runtime_config.py` | Typed runtime config models for execution backend, runtime limits, tool mode, sandbox mode, approval mode, and supporting log policy |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_backend.py` | Backend protocol and resolver used by `run_3s.py` |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/inspect_backend.py` | Lazy-import `inspect_ai` backend implementation, default-off |
| `_agchain/legal-10/tests/test_runtime_config.py` | Runtime config validation and baseline-default tests |
| `_agchain/legal-10/tests/test_execution_backend_contract.py` | Backend resolution, baseline adapter behavior, and supporting-log separation tests |

### Modified files: 10

| File | What changes |
|------|-------------|
| `docs/plans/2026-03-27-runtime-and-environment-contract-inventory.md` | Promote to primary authority and add the six missing InspectAI-facing inventory items plus wrapper boundary section |
| `docs/plans/2026-03-27-environment-and-runtime-profile-contract.md` | Mark as secondary companion doc and trim/annotate duplicated authority claims |
| `docs/plans/2026-03-27-inspect-ai-gap-analysis.md` | Mark superseded by the substrate gap analysis |
| `docs/plans/stale/2026-03-27-environment-and-runtime-profile-implementation-plan.md` | Mark superseded by this consolidation plan or rewrite header to secondary historical status |
| `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py` | Accept runtime config, resolve backend, preserve baseline semantics, and emit runtime-config-aware run records |
| `_agchain/legal-10/runspecs/3-STEP-RUN/adapters/model_adapter.py` | Reuse as baseline direct backend implementation surface or adapt to backend protocol |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/input_assembler.py` | Make explicit which message windows are controlled by runtime config while preserving current assembly logic |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/audit.py` | Record runtime config identity and optional supporting log pointers without weakening canonical audit proof |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/staging.py` | Surface sandbox/tool-mode-related staging invariants explicitly in helper API or comments |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/state.py` | Make baseline state-provider semantics explicit enough to validate against runtime config |

### Existing files verified as live seams

| File | Verified role |
|------|---------------|
| `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py` | Current 3-step runner |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/payload_gate.py` | Current payload admission gate |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/input_assembler.py` | Current staged message window assembler |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/state.py` | Current candidate state owner |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/audit.py` | Current audit artifact writer |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/staging.py` | Current staging isolation helper |
| `_agchain/legal-10/runspecs/3-STEP-RUN/adapters/model_adapter.py` | Current direct OpenAI/Anthropic execution adapter |

---

## Tasks

### Task 1: Consolidate the authority docs

**Files:**
- `docs/plans/2026-03-27-runtime-and-environment-contract-inventory.md`
- `docs/plans/2026-03-27-environment-and-runtime-profile-contract.md`
- `docs/plans/2026-03-27-inspect-ai-gap-analysis.md`
- `docs/plans/stale/2026-03-27-environment-and-runtime-profile-implementation-plan.md`

**Step 1:** Promote the flat inventory doc to explicit primary-authority status in its header and pre-implementation sections.

**Step 2:** Add these concrete items to the flat inventory:
- Eval Runtime Config
- Approval Policy
- Sandbox Binding
- Supporting Execution Logs
- Tool Selection and MCP Selection
- Runtime Limits

**Step 3:** Add a short `InspectAI Integration Boundary` section to the flat inventory naming:
- what AGChain owns
- what is wrapped from InspectAI
- what remains out of scope

**Step 4:** Mark the profile contract as a secondary schema/modeling companion and remove any text that treats it as the main contract.

**Step 5:** Mark `2026-03-27-inspect-ai-gap-analysis.md` as superseded by `2026-03-27-inspect-ai-substrate-gap-analysis.md`.

**Step 6:** Mark the older profile implementation plan as superseded by this consolidation plan.

**Test command:** `rg -n "primary|secondary|superseded|Eval Runtime Config|Approval Policy|Sandbox Binding|Supporting Execution Logs|Runtime Limits|InspectAI Integration Boundary" docs/plans/2026-03-27-*.md`

**Expected output:** The flat inventory contains the new required sections; the profile and exploratory docs are visibly downgraded or superseded.

---

### Task 2: Define the typed runtime config

**File:** `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/runtime_config.py`

**Step 1:** Create a typed runtime config model for the live runner. Include:
- `backend`: `direct` or `inspect`
- `session_mode`: baseline `replay_minimal` only in active mode
- `state_mode`: baseline `type_0` only in active mode
- `tool_mode`: `none`, `standard`, `mcp`
- `approval_mode`: `none`, `policy`
- `sandbox_mode`: `none`, `local`, `docker`
- `runtime_limits`: token/message/time/working/cost/retry limits
- `supporting_logs`: enabled/disabled plus optional target fields
- `remote_mcp_enabled`: default `False`
- `network_enabled`: default `False`

**Step 2:** Add validators that reject invalid combinations in the current phase, for example:
- `backend=inspect` with `remote_mcp_enabled=True`
- `tool_mode != none` while `approval_mode=none` if the selected tool family requires approval
- any network-enabled sandbox mode in the current phase

**Step 3:** Add a `baseline()` constructor that exactly reproduces the current 3-step runtime.

**Step 4:** Serialize the resolved runtime config into a JSON-safe structure that can be written into run artifacts.

**Test command:** `cd _agchain/legal-10; python -m pytest tests/test_runtime_config.py -v`

**Expected output:** Valid baseline config passes; invalid combinations fail with clear messages.

---

### Task 3: Introduce the execution backend seam

**Files:**
- `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_backend.py`
- `_agchain/legal-10/runspecs/3-STEP-RUN/adapters/model_adapter.py`

**Step 1:** Define a backend protocol that the runner can call without knowing whether the implementation is the current direct adapters or a future InspectAI path.

**Step 2:** Keep the current OpenAI/Anthropic direct path as the default backend implementation.

**Step 3:** Ensure the backend protocol exposes enough fields to preserve the current split between candidate execution and judge execution.

**Step 4:** Keep model-role semantics explicit even on the direct path so the future InspectAI backend can map them cleanly.

**Step 5:** Do not move payload admission, staging, or message assembly into the backend layer.

**Test command:** `cd _agchain/legal-10; python -m pytest tests/test_execution_backend_contract.py -v`

**Expected output:** The backend resolver selects the direct backend by default and preserves current role separation.

---

### Task 4: Wire the runner to the runtime config and backend

**Files:**
- `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`
- `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/input_assembler.py`
- `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/state.py`
- `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/staging.py`

**Step 1:** Update `run_3s.py` to resolve a runtime config at launch. The default must be `RuntimeConfig.baseline()`.

**Step 2:** Thread the resolved runtime config through candidate execution and judge execution without changing current baseline message content.

**Step 3:** Keep `payload_gate.py` as the sole owner of payload admission.

**Step 4:** Keep `input_assembler.py` as the sole owner of structured message windows; only add explicit runtime-config-aware toggles where the contract allows them.

**Step 5:** Keep `state.py` as the owner of sanitized carry-forward state and expose only the contract-approved state mode for the current phase.

**Step 6:** Keep `staging.py` responsible for per-call isolation and make any sandbox-related branch points explicit but default-off.

**Test command:** `cd _agchain/legal-10; python -m pytest tests/test_3_step_run_citation_integrity.py tests/test_irac_judge_requirement.py tests/test_runtime_config.py tests/test_execution_backend_contract.py -v`

**Expected output:** Existing Legal-10 tests still pass and new runtime-config tests pass.

---

### Task 5: Add a guarded InspectAI backend module

**File:** `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/inspect_backend.py`

**Step 1:** Implement a lazy-import backend that only imports `inspect_ai` when `backend=inspect` is explicitly selected.

**Step 2:** Limit the first InspectAI-backed implementation to:
- model execution
- model roles
- optional supporting eval/transcript/trace logs

**Step 3:** Leave these concerns outside the InspectAI backend:
- payload admission
- staged message assembly
- candidate state sanitization
- audit proof generation
- bundle semantics

**Step 4:** Default `tool_mode`, `approval_mode`, `sandbox_mode`, and all remote MCP capability to baseline-off unless explicitly enabled by a later contract revision.

**Step 5:** If `inspect_ai` is not installed and the user selects `backend=inspect`, fail fast with a clear setup error.

**Test command:** `cd _agchain/legal-10; python -m pytest tests/test_execution_backend_contract.py -v`

**Expected output:** Baseline runs do not require `inspect_ai`. Selecting the InspectAI backend without the package installed raises a deterministic setup error.

---

### Task 6: Extend benchmark artifact writing without changing canonical proof ownership

**Files:**
- `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/audit.py`
- `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`

**Step 1:** Write the resolved runtime config into the run-level record.

**Step 2:** Add optional supporting-log fields for future InspectAI outputs, for example:
- `inspect_eval_log_path`
- `inspect_transcript_path`
- `inspect_trace_path`

**Step 3:** Keep `audit_log.jsonl` canonical and keep all baseline admissibility fields unchanged:
- staged file hashes
- message hash
- admitted payload IDs
- message byte count

**Step 4:** Ensure supporting execution logs are optional and never required for baseline runs.

**Test command:** `cd _agchain/legal-10; python -m pytest tests/test_execution_backend_contract.py tests/test_3_step_run_citation_integrity.py -v`

**Expected output:** Audit artifacts still contain the existing proof fields; supporting log pointers are additive only.

---

## Completion Criteria

This plan is complete only when:

1. The repo contains one clear primary contract doc, one secondary schema/modeling doc, and one current implementation plan.
2. The flat inventory doc contains the six missing runtime/execution items and the explicit InspectAI wrapper boundary.
3. The Legal-10 runner resolves a typed runtime config and defaults to baseline behavior with no semantic regressions.
4. The current direct adapters still work through the new backend seam.
5. A guarded InspectAI backend module exists but does not become the default path.
6. Canonical AGChain audit proof remains separate from supporting execution logs.
7. All listed pytest commands pass.

## Explicit Risks

1. The first InspectAI backend may initially support only model execution and supporting logs, not the full tool/approval/sandbox surface.
2. The secondary profile contract may still create confusion if it is not clearly marked as companion-only.
3. Because there is no live `inspect_ai` code path in AGChain today, the first backend integration will be sensitive to dependency setup and provider behavior differences.
4. If runtime config is allowed to directly control message windows or payload admission, the boundary will blur and benchmark semantics may drift. That must be prevented in code review.

# 2026-03-27 InspectAI Execution Backend Implementation Plan (Final)

**Status:** Draft — pending approval
**Owner:** Codex
**Date:** 2026-03-27
**Primary intent source:** [2026-03-27-runtime-and-environment-contract-inventory.md](docs/plans/2026-03-27-runtime-and-environment-contract-inventory.md)
**Supporting analysis:** [2026-03-27-inspect-ai-substrate-gap-analysis.md](docs/plans/2026-03-27-inspect-ai-substrate-gap-analysis.md)
**Message contract references:** [prompt-messages.md](docs/agchain/platform/ref/prompt-messages.md), [pdrunner-inspect-ai.md](docs/agchain/platform/ref/pdrunner-inspect-ai.md)
**Implemented prerequisite:** [2026-03-27-profile-types-and-registry-implementation-plan.md](docs/plans/2026-03-27-profile-types-and-registry-implementation-plan.md) and [2026-03-27-profile-implementation-bugfix.md](docs/plans/2026-03-27-profile-implementation-bugfix.md)
**Deferred broader scope:** [2026-03-27-runtime-and-environment-contract-consolidation-implementation-plan.md](docs/plans/2026-03-27-runtime-and-environment-contract-consolidation-implementation-plan.md) — runtime-config, approval policy, sandbox binding, tool selection, MCP, and runtime limits are deferred to that plan.

## Scope Statement

This plan owns **execution plumbing only**: replacing the two direct `ModelAdapter.call_model()` sites in `run_3s.py` with backend-abstracted seams that can dispatch to either the current sync adapters or InspectAI's async model execution while preserving the runner's existing separate eval-model and judge-model CLI surface.

This plan does **not**:

- Make the AGChain workbench page genuinely runnable (that requires a separate job-control/API surface plan)
- Introduce runtime-config, approval policy, sandbox binding, tool selection, MCP selection, or runtime limits (those belong to the consolidation plan)
- Consolidate or reorganize docs (that is doc-housekeeping, not execution plumbing)
- Route backend selection through the profile system (backend selection is a CLI flag)
## Goal

Introduce a guarded execution-backend seam in the Legal-10 3-step runner so AGChain can keep its benchmark-semantic runtime contract while optionally delegating model execution mechanics to `inspect_ai`.

This plan introduces the execution seam needed to support:

1. The current direct adapter path as the default backend
2. An optional InspectAI-backed model execution path
3. Supporting usage/timing metadata captured alongside existing AGChain audit artifacts
## Architecture

The owned seam is the local AGChain runner under `_agchain/legal-10/runspecs/3-STEP-RUN/`, not `platform-api`, frontend, database, or edge functions.

Architecture after this plan:

1. `run_3s.py` continues to own:
   - step order
   - payload admission
   - message-window assembly (fenced `ENV`, `ANCHOR_PACK`, `EVIDENCE_PACK`, `CARRY_FORWARD`, `TASK`, `OUTPUT_GUARD` windows)
   - candidate/judge separation
   - candidate-state lifecycle
   - staging
   - canonical AGChain audit artifacts

2. A new **async** execution backend layer owns:
   - model-call dispatch
   - backend selection
   - normalized execution result shape

3. Backends behind that layer are:
   - `direct` backend: wraps existing sync `ModelAdapter` in an async shell
   - `inspect` backend: uses `inspect_ai.model.get_model()` and `Model.generate()`

4. InspectAI is used as subsystem composition for:
   - model invocation via `Model.generate()`
   - model creation via `get_model("provider/model")` with `GenerateConfig`
   - token accounting via `ModelOutput.usage`
   - execution timing via `ModelOutput.time`

5. InspectAI remains out of scope in this plan for:
   - tool execution
   - MCP transport
   - sandbox lifecycle
   - approval chains
   - compaction
   - solver/task/sample framework
### Async Architecture Decision

The execution backend protocol is **async throughout**. InspectAI's `Model.generate()` is async-only. Rather than hack nested event loops, the protocol is async and the direct backend wraps the existing sync `ModelAdapter.call_model()` inside `async def execute()`.

Impact on `run_3s.py`:

- `run_single_eu()` becomes `async def`
- `run_judge_call()` becomes `async def`
- `main()` remains sync but calls `asyncio.run()` at the entry point
- All non-execution code (payload gate, input assembler, staging, scoring, audit, state) stays sync and is called normally within the async functions
- The two model-call boundaries at line 105 and line 210 become `await backend.execute(...)` calls

This is a calling-convention change at the execution boundary, not a semantic change to any frozen seam.

## Tech Stack

- Python 3.10+, `asyncio`
- Existing Legal-10 runner code under `_agchain/legal-10/runspecs/3-STEP-RUN/`
- Existing profile package under `_agchain/profiles/`
- Existing direct adapters in `adapters/model_adapter.py`
- Optional local `inspect_ai` installation/import path
- Existing pytest-based test suite under `_agchain/legal-10/tests/`
## Manifest

### Platform API

No platform API changes.

The owned runtime seam for this work is the local Legal-10 runner. No new backend HTTP contract is required.

### Observability

No new OpenTelemetry traces, metrics, or platform structured logs are introduced.

This plan does introduce supporting execution metadata in benchmark-local artifacts:

- backend identifier (`direct` or `inspect`)
- provider/model identity when available
- usage metadata when available (locked keys: `input_tokens`, `output_tokens`, `total_tokens`, `total_cost`, `reasoning_tokens`)
- execution timing in milliseconds when available

These are supporting fields inside existing AGChain runtime artifacts. They do not replace AGChain canonical audit ownership. Supporting execution logs from InspectAI (eval logs, transcripts, traces) remain distinct from canonical `audit_log.jsonl` and are not introduced in this plan.

### Database Migrations

No database changes.

### Edge Functions

No edge function changes.

### Frontend Surface Area

No frontend changes.

The AGChain workbench page (`AgchainBenchmarkWorkbenchPage.tsx`) currently shows only `#steps` as live. Making it genuinely runnable requires a separate job-control/API surface plan. This plan does not touch frontend.

### Developer Env Ownership

This plan introduces one new optional local dependency seam:

- `inspect_ai` may be imported when the `inspect` backend is selected

The direct backend must continue to work when `inspect_ai` is not installed.

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

### Locked Decisions

1. The runner remains AGChain-semantic first; this plan only changes model execution plumbing.
2. The default backend after implementation remains `direct`.
3. The optional InspectAI path is enabled only through the `--execution-backend` CLI flag, not through the profile system.
4. The execution backend protocol is async. The direct backend wraps sync adapters. `run_3s.py` gains `async def` at the execution boundary and `asyncio.run()` at entry.
5. The backend receives **fully-assembled message arrays** from `input_assembler.py` (for eval calls) or from `run_judge_call` (for judge calls). It must not decompose, reorder, reinterpret, or modify any message content, fenced windows, or role assignments. The message contract is defined in [prompt-messages.md](docs/agchain/platform/ref/prompt-messages.md).
6. The backend protocol accepts `messages: list[dict[str, str]]` — the format the runner already produces. The inspect backend converts to InspectAI `ChatMessage` types internally. InspectAI types must not leak back into AGChain code.
7. The backend `execute()` method accepts `temperature: float` and `max_tokens: int` as explicit per-call parameters (the judge call uses `max_tokens=2048`, eval calls use `max_tokens=4096`).
8. The `ExecutionResult` contract is fully locked (see Locked ExecutionResult Contract below).
9. Existing `audit_log.jsonl` remains canonical for benchmark proof; InspectAI-native logs are supporting evidence only and are not consumed by this plan.
10. AGChain runtime helpers (`payload_gate.py`, `input_assembler.py`, `state.py`, `staging.py`, scorers) remain the authoritative owners of their respective concerns.
11. `run_3s.py` must continue to call the same payload-gate, state, staging, scorer, and audit flows.
12. Candidate and judge calls both move through the new execution backend seam.
13. `run_3s.py` resolves **two backend instances per run**: one for eval/candidate calls and one for judge calls. The backend kind comes from one CLI flag, but provider/model selection continues to respect the existing `--provider/--model` and `--judge-provider/--judge-model` split.
14. InspectAI model-role mapping is limited in this plan to eval/candidate and judge execution routing.
15. If `inspect_ai` is unavailable and the `inspect` backend is requested, the runner must fail clearly with an actionable error.
16. Tool execution, MCP, sandboxing, approval policy, runtime-config, and compaction remain deferred to the consolidation plan.
### Locked ExecutionResult Contract

```python
@dataclass
class ExecutionResult:
    response_text: str                    # Required. Model response text.
    backend: str                          # Required. "direct" or "inspect".
    model_name: str | None                # Required when available from backend.
    provider: str | None                  # Required when available from backend.
    usage: dict[str, Any] | None          # Usage-only. See locked keys below.
    timing_ms: float | None               # Milliseconds. Converted from seconds in inspect backend.
```

**Locked usage keys** (when `usage` is not `None`):

| Key | Type | Source |
|-----|------|--------|
| `input_tokens` | `int` | InspectAI `ModelUsage.input_tokens` |
| `output_tokens` | `int` | InspectAI `ModelUsage.output_tokens` |
| `total_tokens` | `int` | InspectAI `ModelUsage.total_tokens` |
| `total_cost` | `float \| None` | InspectAI `ModelUsage.total_cost` (dollars) |
| `reasoning_tokens` | `int \| None` | InspectAI `ModelUsage.reasoning_tokens` |

The `usage` dict is **usage-only**. Moderation errors, refusal reasons, and other non-usage metadata must not be placed in this dict.

**Direct backend:** sets `usage = None`, `timing_ms = None`, `model_name` from `adapter.model_name`, `provider` from adapter type.

**Inspect backend:** populates all fields from `ModelOutput`.

### Locked Error Handling Contract

**Transport/backend failures** (HTTP errors, API errors, connection timeouts, InspectAI import failures): **raise as exceptions**. These must not be silently flattened into an `ExecutionResult` with empty `response_text`. The runner's existing `except Exception` at line 504 handles these.

**Model refusals** (content moderation, safety filters): the inspect backend sets `response_text = output.completion` (which may be empty string). The runner's existing parse-failure path at line 214-217 handles this — it logs a warning, marks `_parse_error`, and scores the step at 0. The refusal reason from `ModelOutput.error` is **not** surfaced in `ExecutionResult` for this pass.

This distinction prevents blurring "model refused" with "backend broke."

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. Running the runner without any backend flag preserves the current `direct` execution path.
2. Both existing model call sites in `run_3s.py` use the new execution backend seam instead of calling `ModelAdapter.call_model()` directly.
3. The direct backend returns a normalized execution result whose `response_text` is byte-identical to the pre-plan direct-adapter response for the same mocked inputs.
4. The InspectAI backend can be imported and instantiated lazily without breaking `--help` or direct-backend runs when `inspect_ai` is absent.
5. Requesting the InspectAI backend without `inspect_ai` installed fails with a clear message, not an opaque import traceback.
6. Existing AGChain audit artifacts continue to be emitted, and supporting execution metadata is recorded without removing existing canonical fields.
7. Existing profile tests continue to pass.
8. Existing IRAC tests continue to pass.
9. The existing separate eval-model and judge-model CLI surface is preserved under both backend kinds.
10. A new execution-backend test suite covers backend selection, normalized result shape, direct-backend behavior, async protocol, per-call parameters, and missing-Inspect failure behavior.
### Locked Platform Surface

CLI surface added or modified:

- add `--execution-backend` with allowed values `direct` and `inspect`
- default value: `direct`

No other new public CLI flags are introduced in this plan.

### Locked Observability Surface

Canonical AGChain artifacts retained:

- `audit_log.jsonl`
- `run.jsonl`
- `run_manifest.json`
- `summary.json`
- `trace.jsonl`
- `candidate_state.json`

Supporting execution metadata may be added into existing emitted records, but this plan must not:

- remove existing canonical fields
- rename current artifact files
- replace AGChain audit proof with InspectAI-native transcript/log files
- introduce InspectAI eval logs, transcripts, or traces as new artifact files
### Locked Inventory Counts

- New files: `4`
- Modified files: `2`
- New test files: `1` (included in the 4 new)
- Total files touched: `6`

### Locked File Inventory

#### New files

1. `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_result.py`
2. `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_backend.py`
3. `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/inspect_backend.py`
4. `_agchain/legal-10/tests/test_execution_backend.py`

#### Modified files

1. `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`
2. `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/audit.py`
## Frozen Seam Contract

### Already-Assembled Messages Guard

The execution backend receives the fully-assembled message array and executes it. The message array is constructed by `input_assembler.py` (for eval/candidate calls) and by `run_judge_call()` (for judge calls), following the fenced-window contract defined in [prompt-messages.md](docs/agchain/platform/ref/prompt-messages.md).

The backend must not:

- decompose messages into sub-components
- reinterpret fenced windows (`ENV`, `ANCHOR_PACK`, `EVIDENCE_PACK`, `CARRY_FORWARD`, `TASK`, `OUTPUT_GUARD`)
- modify the system/user role split
- reorder message content
- apply its own prompt engineering or message transformation
- expose InspectAI `ChatMessage` types outside the inspect backend module

The backend is a **dumb execution pipe**: messages in, `ExecutionResult` out.

### Frozen Files

The following files are compatibility-sensitive and must retain their current benchmark semantics:

1. `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/payload_gate.py`
   - no behavior changes
   - no signature changes

2. `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/input_assembler.py`
   - message-window logic remains the AGChain-owned source of truth
   - no semantic refactor in this plan

3. `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/state.py`
   - `CandidateState` semantics remain unchanged

4. `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/staging.py`
   - staging lifecycle remains unchanged

5. `_agchain/legal-10/runspecs/3-STEP-RUN/scorers/d1_known_authority_scorer.py`
   - unchanged

6. `_agchain/legal-10/runspecs/3-STEP-RUN/scorers/citation_integrity.py`
   - unchanged

Existing behavior that must survive:

- candidate call still happens after staged payload/message assembly
- judge call still happens after candidate outputs exist
- audit emission still records message hashes, response hashes, payload admission, and staged file evidence
- profile-based message/session behavior remains opt-in and compatible with the direct path
## Exact File Responsibilities

### `execution_result.py`

Define the `ExecutionResult` dataclass with the locked contract above. This is the sole return type for all execution backends.

### `execution_backend.py`

Define:

- `ExecutionBackend` — async abstract base with:
  ```python
  async def execute(
      self,
      messages: list[dict[str, str]],
      *,
      temperature: float = 0.0,
      max_tokens: int = 4096,
  ) -> ExecutionResult:
  ```
- `DirectBackend` — wraps existing `ModelAdapter`, calls `call_model()` synchronously inside the async method, returns `ExecutionResult` with `response_text` populated, `usage = None`, `timing_ms = None`
- `resolve_backend(
      name: str,
      *,
      provider: str,
      model: str,
      adapter: ModelAdapter | None = None,
  ) -> ExecutionBackend` — factory that:
  - returns `DirectBackend(adapter)` for `"direct"` and requires `adapter` to be passed
  - accepts `provider` and `model` as separate inputs; `run_3s.py` does not pre-compose an InspectAI `"provider/model"` string
  - lazy-imports and returns `InspectBackend(provider=provider, model=model)` for `"inspect"`
  - raises `ValueError` on unknown backend name

### `inspect_backend.py`

Define `InspectBackend(ExecutionBackend)`:

- Lazy-imports `inspect_ai.model.get_model`, `GenerateConfig`, `ChatMessageSystem`, `ChatMessageUser` at first use
- Creates InspectAI model via `get_model("provider/model", config=GenerateConfig(...))` during initialization using the provider/model pair passed into `resolve_backend()`
- `execute()` converts `list[dict[str, str]]` to `list[ChatMessage]` internally
- Calls `await model.generate(messages, config=GenerateConfig(temperature=..., max_tokens=...))`
- Maps `ModelOutput` to `ExecutionResult`:
  - `response_text = output.completion`
  - `timing_ms = output.time * 1000.0 if output.time is not None else None`
  - `usage` = dict from `ModelUsage` fields using locked keys
  - `model_name = output.model`
- Raises `ImportError` with clear message if `inspect_ai` is not installed
- Raises transport/API errors as exceptions (does not catch them)
- Does not add tool, MCP, sandbox, or approval behavior

### `run_3s.py`

Modify only enough to:

- accept `--execution-backend` CLI argument (default `"direct"`)
- resolve `eval_backend` and `judge_backend` once in `main()` via `resolve_backend()`, preserving the existing separate eval/judge provider-model selection
- change `run_judge_call(..., judge_adapter: ModelAdapter, ...)` to `async def run_judge_call(..., judge_backend: ExecutionBackend, ...)`; the function keeps judge-message assembly and dispatches `await judge_backend.execute(...)` internally
- change `run_single_eu(..., eval_adapter: ModelAdapter, judge_adapter: ModelAdapter, ...)` to accept `eval_backend` and `judge_backend`; the function keeps candidate-step orchestration and judge handoff internally
- make `run_single_eu()` and `run_judge_call()` async
- add `asyncio.run()` at the entry point in `main()`
- replace `judge_adapter.call_model(messages, ...)` at line 105 with `await judge_backend.execute(messages, ...)`
- replace `eval_adapter.call_model(messages, ...)` at line 210 with `await eval_backend.execute(messages, ...)`
- consume `ExecutionResult.response_text` wherever raw response text was previously used
- use `ExecutionResult.model_name` for emitted `model`, `summary.json` `eval_model` / `judge_model`, and `run_manifest.json` reproducibility fields when available; fall back to the existing adapter/CLI model string only if backend metadata is `None`
- append supporting execution metadata (backend, provider, model_name, usage, timing_ms) into existing emitted run records

Do not move step logic, scoring logic, payload admission, or staging ownership out of this file.

### `audit.py`

Keep artifact file names and canonical emission behavior intact.

Allowed change:

- permit additional optional supporting metadata fields in emitted run records (backend name, provider, model name, usage, timing)

Disallowed change:

- changing canonical record identity, hash logic, or file naming
- making supporting metadata required for baseline runs

### `test_execution_backend.py`

Add tests for:

- backend resolution (`"direct"` returns `DirectBackend`, `"inspect"` with missing package raises clear error)
- inspect resolution uses explicit `provider` / `model` inputs; provider-model concatenation stays inside the inspect backend
- `ExecutionResult` contract (all locked fields present, correct types)
- direct backend preserves `response_text` byte-identical to mocked `ModelAdapter.call_model()` return
- async protocol works (tests use `pytest-asyncio` or `asyncio.run()`)
- per-call `temperature` and `max_tokens` are forwarded to the adapter
- missing InspectAI failure path (clear message, not opaque traceback)
- runner `--help` works without import failure when `inspect_ai` absent

Tests must not require live provider credentials.

## Tasks

### Task 1: Write failing tests for ExecutionResult and DirectBackend

**Files:** `_agchain/legal-10/tests/test_execution_backend.py`

**Step 1:** Create test file with `pytest-asyncio` or `asyncio.run()` test helpers.
**Step 2:** Write test: `ExecutionResult` has all six locked fields with correct types.
**Step 3:** Write test: `DirectBackend.execute()` returns `ExecutionResult` where `response_text` matches mocked `call_model()` return, `backend == "direct"`, `usage is None`, `timing_ms is None`.
**Step 4:** Write test: `DirectBackend.execute()` forwards `temperature` and `max_tokens` to the adapter.
**Step 5:** Run tests — confirm they fail (modules don't exist yet).

**Test command:**
```
cd E:\writing-system\_agchain\legal-10
python -m pytest tests/test_execution_backend.py -k "result or direct" -q
```

**Expected output:** Tests fail with `ImportError` (modules not yet created).

**Commit:** `test: add failing tests for execution result and direct backend`

---

### Task 2: Implement ExecutionResult and DirectBackend

**Files:**
- `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_result.py`
- `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_backend.py`

**Step 1:** Create `execution_result.py` with the locked `ExecutionResult` dataclass.
**Step 2:** Create `execution_backend.py` with `ExecutionBackend` abstract base (async `execute()` method), `DirectBackend` implementation, and `resolve_backend()` factory.
**Step 3:** `DirectBackend.execute()` calls `adapter.call_model(messages, temperature=temperature, max_tokens=max_tokens)` synchronously and wraps the string result in `ExecutionResult`.
**Step 4:** Run the tests from Task 1.

**Test command:**
```
cd E:\writing-system\_agchain\legal-10
python -m pytest tests/test_execution_backend.py -k "result or direct" -q
```

**Expected output:** All direct-backend and result-shape tests pass.

**Commit:** `add execution result and direct backend seam`

---

### Task 3: Write failing tests for InspectBackend and missing-package error

**Files:** `_agchain/legal-10/tests/test_execution_backend.py`

**Step 1:** Write test: `resolve_backend("inspect", provider="openai", model="gpt-4o")` raises `ImportError` with actionable message when `inspect_ai` is not installed.
**Step 2:** Write test: `InspectBackend` can be instantiated when `inspect_ai` is available (mock the import).
**Step 3:** Write test: `InspectBackend.execute()` returns `ExecutionResult` with all fields populated from mocked `ModelOutput`.
**Step 4:** Write test: `InspectBackend` converts `timing_ms` correctly (seconds × 1000).
**Step 5:** Write test: `InspectBackend` populates usage dict with locked keys only.
**Step 6:** Run tests — confirm new tests fail.

**Test command:**
```
cd E:\writing-system\_agchain\legal-10
python -m pytest tests/test_execution_backend.py -k inspect -q
```

**Expected output:** New inspect tests fail (module not yet created).

**Commit:** `test: add failing tests for inspect backend and missing-package error`

---

### Task 4: Implement InspectBackend

**Files:**
- `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/inspect_backend.py`
- `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_backend.py` (register in resolver)

**Step 1:** Create `inspect_backend.py` with lazy import guard.
**Step 2:** Implement message conversion: iterate `list[dict[str, str]]` → `ChatMessageSystem` / `ChatMessageUser` based on `role` field.
**Step 3:** Implement `execute()`: call `await self._model.generate(messages, config=GenerateConfig(temperature=..., max_tokens=...))`.
**Step 4:** Map `ModelOutput` → `ExecutionResult` with locked field mappings and unit conversion.
**Step 5:** Update `resolve_backend()` in `execution_backend.py` to lazy-import and return `InspectBackend` for `"inspect"`.
**Step 6:** Run all backend tests.

**Test command:**
```
cd E:\writing-system\_agchain\legal-10
python -m pytest tests/test_execution_backend.py -q
python runspecs/3-STEP-RUN/run_3s.py --help
```

**Expected output:** All backend tests pass. `--help` works without import failure.

**Commit:** `add guarded inspect-ai execution backend`

---

### Task 5: Wire backend into the runner

**Files:** `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`

**Step 1:** Add `--execution-backend` argument to `argparse` with default `"direct"` and choices `["direct", "inspect"]`.
**Step 2:** In `main()`, resolve `eval_backend` and `judge_backend` separately via `resolve_backend(args.execution_backend, provider=..., model=..., adapter=...)`, using the existing eval `--provider/--model` pair for candidate calls and the existing `--judge-provider/--judge-model` pair for judge calls.
**Step 3:** Make `run_judge_call()` async and change its parameter from `judge_adapter` to `judge_backend`. Keep judge-message assembly inside `run_judge_call()`, but replace `judge_adapter.call_model(messages, temperature=0.0, max_tokens=2048)` with `await judge_backend.execute(messages, temperature=0.0, max_tokens=2048)`. Use `result.response_text` for the raw response and `result.model_name` (fallback: existing adapter/CLI model string) for emitted judge model identity.
**Step 4:** Make `run_single_eu()` async and change its parameters from `eval_adapter` / `judge_adapter` to `eval_backend` / `judge_backend`. Keep candidate-step orchestration and judge handoff in this function, but replace `eval_adapter.call_model(messages, temperature=0.0, max_tokens=4096)` with `await eval_backend.execute(messages, temperature=0.0, max_tokens=4096)`. Use `result.response_text` for the raw response and `result.model_name` (fallback: existing adapter/CLI model string) for emitted candidate model identity, `summary.json`, and `run_manifest.json`.
**Step 5:** Wrap the EU iteration loop in `main()` with `asyncio.run()` on an async inner function.
**Step 6:** Verify `--help` still works. Verify existing behavior is preserved with `--execution-backend direct`.

**Test command:**
```
cd E:\writing-system\_agchain\legal-10
python runspecs/3-STEP-RUN/run_3s.py --help
python -m pytest tests/test_irac_judge_requirement.py -q
python -m pytest tests/test_execution_backend.py -q
```

**Expected output:** Help text includes `--execution-backend`. All tests pass.

**Commit:** `wire execution backend selection into legal-10 runner`

---

### Task 6: Add supporting execution metadata to audit artifacts

**Files:**
- `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/audit.py`
- `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`

**Step 1:** In `run_3s.py`, after each `eval_backend.execute()` / `judge_backend.execute()` call, capture the `ExecutionResult` and pass its metadata fields into the existing `emit_run_record()` calls.
**Step 2:** Add optional `execution_metadata` dict to run records: `{"backend": result.backend, "provider": result.provider, "model_name": result.model_name, "usage": result.usage, "timing_ms": result.timing_ms}`.
**Step 3:** Do not change `emit_audit_record()` canonical fields or hash computation.
**Step 4:** Add `run_manifest.json` field for `execution_backend` alongside existing `session_strategy`.
**Step 5:** Write a test that verifies run records contain execution metadata when populated.

**Test command:**
```
cd E:\writing-system\_agchain\legal-10
python -m pytest tests/test_execution_backend.py -q
python -m pytest tests/test_irac_judge_requirement.py -q
python -m pytest tests/test_profile_types.py tests/test_profile_registry.py -q
```

**Expected output:** All tests pass. Existing profile and IRAC tests unaffected.

**Commit:** `capture supporting execution metadata in audit artifacts`

---

### Task 7: Final regression sweep

**Files:** none (verification only)

**Step 1:** Run the full test suite.
**Step 2:** Verify `--help` works without `inspect_ai` installed.
**Step 3:** From the `runspecs/3-STEP-RUN` directory, verify `resolve_backend("inspect", provider="openai", model="gpt-4o")` fails with a clear `ImportError` message when `inspect_ai` is not installed.
**Step 4:** Confirm inventory count matches: 4 new files, 2 modified files.

**Test command:**
```powershell
cd E:\writing-system\_agchain\legal-10
python -m pytest tests/ -q
python runspecs/3-STEP-RUN/run_3s.py --help
cd E:\writing-system\_agchain\legal-10\runspecs\3-STEP-RUN
@'
from runtime.execution_backend import resolve_backend
try:
    resolve_backend("inspect", provider="openai", model="gpt-4o")
except ImportError as e:
    print(type(e).__name__, e)
'@ | python -
```

**Expected output:** Full-suite tests pass, or any citation-integrity failures are confirmed to be the same pre-existing stale-path issue accepted in Completion Criteria. Help works. Inspect backend without package prints a clear `ImportError` message naming the missing install requirement.

**Commit:** no commit (verification only)

## Explicit Risks Accepted In This Plan

1. **InspectAI import shape.** The exact `inspect_ai` model API may differ from the reference repo analysis. Task 4 may require one revision pass after live import testing. This is noted in the substrate gap analysis and accepted.

2. **Direct backend metadata gap.** The direct backend sets `usage = None` and `timing_ms = None` because the current `OpenAIAdapter` and `AnthropicAdapter` do not expose token counts or timing. This is acceptable — the normalized result allows `None` for all metadata fields.

3. **Deferred InspectAI capabilities.** Tool execution, MCP, sandbox, approval chains, and compaction are all supported by InspectAI but intentionally deferred. The consolidation plan owns that scope.

4. **Async conversion risk.** Making `run_single_eu` and `run_judge_call` async changes calling convention. The frozen seam contract ensures no semantic change to payload admission, message assembly, state, staging, or scoring. The async boundary is at the execution call sites only.

5. **Moderation refusal handling.** Model refusals produce empty `response_text` and rely on the existing parse-failure path. The refusal reason is not surfaced in `ExecutionResult` for this pass. If refusal diagnostics become important, a later revision can add a separate metadata field — but not in the `usage` dict.

## Completion Criteria

This plan is complete only when:

1. The codebase contains the new execution backend seam and normalized `ExecutionResult`.
2. The async protocol is in place: `ExecutionBackend.execute()` is async, `run_single_eu()` and `run_judge_call()` are async, `main()` uses `asyncio.run()`.
3. The default direct path still works without InspectAI installed.
4. The optional InspectAI path is selectable via `--execution-backend inspect` and fails clearly when unavailable.
5. Both candidate and judge execution are routed through the backend layer with correct per-call `temperature` and `max_tokens`.
6. AGChain canonical audit artifacts are still the benchmark proof surface.
7. Supporting execution metadata is captured in run records without replacing canonical fields.
8. The `usage` dict contains only the locked usage keys — no moderation errors or non-usage metadata.
9. Existing profile tests pass.
10. Existing IRAC tests pass.
11. File inventory matches: 4 new, 2 modified, 6 total.
12. Any citation-integrity failures are confirmed to be the same pre-existing stale-path issue, not new regressions from this plan.

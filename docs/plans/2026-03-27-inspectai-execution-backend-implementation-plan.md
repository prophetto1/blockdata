# 2026-03-27 InspectAI Execution Backend Implementation Plan

**Status:** Draft  
**Owner:** Codex  
**Date:** 2026-03-27  
**Primary intent source:** [2026-03-27-runtime-and-environment-contract-inventory.md](E:/writing-system/docs/plans/2026-03-27-runtime-and-environment-contract-inventory.md)  
**Supporting analysis:** [2026-03-27-inspect-ai-substrate-gap-analysis.md](E:/writing-system/docs/plans/2026-03-27-inspect-ai-substrate-gap-analysis.md)  
**Implemented prerequisite:** [2026-03-27-profile-types-and-registry-implementation-plan.md](E:/writing-system/docs/plans/2026-03-27-profile-types-and-registry-implementation-plan.md) and [2026-03-27-profile-implementation-bugfix.md](E:/writing-system/docs/plans/2026-03-27-profile-implementation-bugfix.md)

## Goal

Introduce a guarded execution-backend seam in the Legal-10 3-step runner so AGChain can keep its benchmark-semantic runtime contract while optionally delegating model execution mechanics to `inspect_ai`.

This plan does **not** broaden into tool execution, MCP, sandbox lifecycle, compaction, or doc-consolidation workstreams. It only introduces the execution seam needed to support:

1. the current direct adapter path as the default backend
2. an optional InspectAI-backed model execution path
3. supporting usage/timing metadata captured alongside existing AGChain audit artifacts

## Architecture

The owned seam is the local AGChain runner under `_agchain/legal-10/runspecs/3-STEP-RUN/`, not `platform-api`, frontend, database, or edge functions. The skill's default platform-oriented scaffold does not define the real runtime seam here, so this plan locks that mismatch explicitly.

Architecture after this plan:

1. `run_3s.py` continues to own:
   - step order
   - payload admission
   - message-window assembly
   - candidate/judge separation
   - candidate-state lifecycle
   - staging
   - canonical AGChain audit artifacts

2. A new execution backend layer owns:
   - model-call dispatch
   - backend selection
   - normalized execution result shape

3. Backends behind that layer are:
   - `direct` backend using the existing `ModelAdapter` path
   - `inspect` backend using `inspect_ai` model execution primitives

4. InspectAI is used as subsystem composition for:
   - model invocation
   - model roles
   - retry/backoff
   - token accounting / usage capture

5. InspectAI remains out of scope in this plan for:
   - tool execution
   - MCP transport
   - sandbox lifecycle
   - approval chains
   - compaction

## Tech Stack

- Python 3.10+
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
- usage metadata when available
- execution timing when available

These are supporting fields inside existing AGChain runtime artifacts. They do not replace AGChain canonical audit ownership.

### Database Migrations

No database changes.

### Edge Functions

No edge function changes.

### Frontend Surface Area

No frontend changes.

### Developer Env Ownership

This plan introduces one new optional local dependency seam:

- `inspect_ai` may be imported when the `inspect` backend is selected

The direct backend must continue to work when `inspect_ai` is not installed.

## Pre-Implementation Contract

### Locked Decisions

1. The runner remains AGChain-semantic first; this plan only changes model execution plumbing.
2. The default backend after implementation remains `direct`.
3. The optional InspectAI path is enabled only through explicit backend selection.
4. The backend contract returns a richer normalized object, not a bare string.
5. The normalized object must include at least `response_text`; it may include `usage`, `timing_ms`, `backend`, and `model_name`.
6. Existing `audit_log.jsonl` remains canonical for benchmark proof; InspectAI-native logs are supporting evidence only.
7. `run_3s.py` must continue to call the same payload-gate, state, staging, scorer, and audit flows.
8. Candidate and judge calls both move through the new execution backend seam.
9. InspectAI model-role mapping is limited in this plan to eval/candidate and judge execution routing.
10. If `inspect_ai` is unavailable and the `inspect` backend is requested, the runner must fail clearly with an actionable error.
11. Tool execution, MCP, sandboxing, approval policy, and compaction remain deferred.

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
9. A new execution-backend test suite covers backend selection, normalized result shape, direct-backend behavior, and missing-Inspect failure behavior.

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

### Locked Inventory Counts

- New files: `4`
- Modified files: `3`
- New test files: `1`
- Total files touched: `7`

### Locked File Inventory

#### New files

1. `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_result.py`
2. `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_backend.py`
3. `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/inspect_backend.py`
4. `_agchain/legal-10/tests/test_execution_backend.py`

#### Modified files

1. `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`
2. `_agchain/legal-10/runspecs/3-STEP-RUN/adapters/model_adapter.py`
3. `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/audit.py`

## Frozen Seam Contract

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

### `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_result.py`

Define the normalized execution result object.

Required fields:

- `response_text: str`
- `backend: str`
- `model_name: str | None`
- `usage: dict[str, Any] | None`
- `timing_ms: float | None`
- `provider: str | None`

This object is the explicit return contract for execution backends.

### `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_backend.py`

Define:

- backend protocol / abstract base
- backend resolver / factory
- direct backend wrapper that adapts existing `ModelAdapter`

The direct backend must call the current adapters and normalize their result into `ExecutionResult`.

### `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/inspect_backend.py`

Define the optional InspectAI backend.

Responsibilities:

- lazy import of `inspect_ai`
- map eval/judge call inputs into InspectAI model execution
- capture response text and supporting usage/timing metadata
- raise a clear import/configuration error if InspectAI is unavailable

Do not add tool, MCP, sandbox, or approval behavior here in this plan.

### `_agchain/legal-10/runspecs/3-STEP-RUN/adapters/model_adapter.py`

Keep existing provider adapters intact, but add the narrowest compatibility surface needed for the direct backend to normalize responses without changing provider behavior.

Allowed changes:

- helper methods or small adapter-level metadata accessors
- minimal typing updates if needed

Disallowed changes:

- changing provider request semantics
- introducing InspectAI imports into this file
- removing existing `create_adapter()` behavior

### `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`

Modify only enough to:

- accept `--execution-backend`
- resolve the backend once in `main()`
- route both candidate and judge model calls through the backend seam
- consume `ExecutionResult.response_text`
- append supporting execution metadata into existing emitted records

Do not move step logic, scoring logic, payload admission, or staging ownership out of this file.

### `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/audit.py`

Keep artifact file names and canonical emission behavior intact.

Allowed change:

- permit additional supporting metadata fields in emitted records

Disallowed change:

- changing canonical record identity, hash logic, or file naming

### `_agchain/legal-10/tests/test_execution_backend.py`

Add tests for:

- backend resolution
- normalized result shape
- direct backend preserves response text
- missing InspectAI failure path
- runner help/import path remains safe when InspectAI is absent

## Tasks

### Task 1: Add normalized execution result and backend protocol

Files:

- `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_result.py`
- `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_backend.py`

Steps:

1. Add `ExecutionResult`.
2. Add execution backend protocol / abstract base.
3. Implement direct backend wrapper around the existing `ModelAdapter`.
4. Ensure the direct backend returns `ExecutionResult` with `response_text` populated and optional metadata fields set to `None` when unavailable.

Verification commands:

```powershell
cd E:\writing-system\_agchain\legal-10
python -m pytest tests/test_execution_backend.py -k direct -q
```

Expected output:

- direct-backend tests pass
- no existing runner imports break

Suggested commit message:

`add normalized execution result and direct backend seam`

### Task 2: Add optional InspectAI backend

Files:

- `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/inspect_backend.py`
- `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_backend.py`

Steps:

1. Add lazy InspectAI import logic.
2. Implement InspectAI backend execution using InspectAI model execution primitives.
3. Map response text, backend name, model name, usage, and timing into `ExecutionResult`.
4. Raise a clear error if the backend is requested without InspectAI installed.

Verification commands:

```powershell
cd E:\writing-system\_agchain\legal-10
python -m pytest tests/test_execution_backend.py -k inspect -q
python runspecs/3-STEP-RUN/run_3s.py --help
```

Expected output:

- missing-Inspect behavior is explicit and test-covered
- `--help` works without import failure

Suggested commit message:

`add guarded inspectai execution backend`

### Task 3: Wire backend selection into the runner

Files:

- `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`

Steps:

1. Add `--execution-backend` CLI argument with default `direct`.
2. Resolve the backend once in `main()`.
3. Replace both direct `call_model()` call sites with backend execution calls.
4. Use `ExecutionResult.response_text` anywhere raw response text was previously consumed.
5. Preserve existing candidate/judge flow, parsing, and scoring logic.

Verification commands:

```powershell
cd E:\writing-system\_agchain\legal-10\runspecs\3-STEP-RUN
python run_3s.py --help
```

Expected output:

- help text includes `--execution-backend`
- no import/runtime error on direct path

Suggested commit message:

`wire execution backend selection into legal10 runner`

### Task 4: Add supporting execution metadata to existing artifacts

Files:

- `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/audit.py`
- `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`

Steps:

1. Extend emitted audit/run records to accept optional supporting execution metadata.
2. Record backend name for both candidate and judge calls.
3. Record usage/timing/model metadata when available.
4. Preserve all current canonical fields and hashing behavior.

Verification commands:

```powershell
cd E:\writing-system\_agchain\legal-10
python -m pytest tests/test_execution_backend.py -k metadata -q
python -m pytest tests/test_irac_judge_requirement.py -q
```

Expected output:

- metadata tests pass
- existing IRAC tests still pass

Suggested commit message:

`capture supporting execution metadata in existing audit artifacts`

### Task 5: Add execution backend tests and regression coverage

Files:

- `_agchain/legal-10/tests/test_execution_backend.py`

Steps:

1. Add direct-backend normalization tests.
2. Add backend-resolution tests.
3. Add missing-Inspect failure tests.
4. Add a runner-safe import/help regression test if practical.
5. Ensure tests do not require live provider credentials.

Verification commands:

```powershell
cd E:\writing-system\_agchain\legal-10
python -m pytest tests/test_execution_backend.py -q
python -m pytest tests/test_profile_types.py tests/test_profile_registry.py -q
python -m pytest tests/test_irac_judge_requirement.py -q
```

Expected output:

- new execution-backend tests pass
- existing profile tests pass
- existing IRAC tests pass

Suggested commit message:

`add execution backend regression coverage`

## Explicit Risks Accepted In This Plan

1. InspectAI model invocation details may require one revision pass after live import testing, because the exact local import shape may differ from the substrate analysis summary.
2. Usage/cost/timing metadata available from the direct backend may be partial or absent; `None` is acceptable in the normalized result where the current adapters do not expose more.
3. This plan intentionally defers tool execution, MCP, sandbox, approval chains, and compaction even though InspectAI supports them.
4. This plan introduces a new backend seam inside a compatibility-sensitive runner; the frozen seam contract exists to prevent semantic drift into message assembly, state, or scoring behavior.

## Completion Criteria

This plan is complete only when:

1. The codebase contains the new execution backend seam and normalized result object.
2. The default direct path still works without InspectAI installed.
3. The optional InspectAI path is selectable and fails clearly when unavailable.
4. Both candidate and judge execution are routed through the backend layer.
5. AGChain canonical audit artifacts are still the benchmark proof surface.
6. Supporting execution metadata is captured without replacing canonical AGChain ownership.
7. Existing profile tests pass.
8. Existing IRAC tests pass.
9. Any citation-integrity failures are confirmed to be the same pre-existing stale-path issue, not new regressions from this plan.

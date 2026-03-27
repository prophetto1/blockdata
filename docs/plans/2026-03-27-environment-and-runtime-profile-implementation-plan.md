# Environment and Runtime Profile Implementation Plan

**Goal:** Formalize the 15 profiles defined in the contract document as typed Python objects with a registry pattern, then wire the composed profile object into the existing 3-step runner so that run configuration is explicit rather than implicit.

**Architecture:** Profile types live in `_agchain/` as benchmark-platform objects. The existing runtime helpers (`state.py`, `input_assembler.py`, `payload_gate.py`, `audit.py`) are not rewritten — they become the implementations behind the Type 0 state provider and Replay_Minimal session strategy. The composed profile object is passed into `run_3s.py` at run launch. Future state providers and session strategies register against the same contracts.

**Tech Stack:** Python 3.12+, Pydantic v2 (for schema validation and serialization), pytest.

**Status:** Draft
**Author:** AI worker
**Date:** 2026-03-27

---

## Pre-Implementation Contract

No major decision may be improvised during implementation. If any item below needs to change, stop and revise this plan first.

### Locked Decisions

1. Profile types are Pydantic models, not plain dataclasses. Pydantic gives us JSON schema export (for future UI rendering) and strict validation.
2. The registry pattern uses a simple `dict[str, Type]` mapping, not a plugin discovery system. Strategies register by importing and calling `register()`. No metaclass magic.
3. The existing runtime helpers are not refactored in this plan. They are wrapped as the baseline implementations of the Type 0 and Replay_Minimal contracts.
4. The composed profile object is a Pydantic model that references one session strategy + one state provider + one tool strategy by ID, with strategy-specific parameters.
5. `run_3s.py` accepts a profile object (or profile ID that resolves to one). The current hardcoded behavior becomes the `baseline` profile.
6. No frontend, database, or platform-api changes in this plan.
7. No Inspect AI integration in this plan. That is a separate subsequent plan.

---

## Manifest

### Platform API

No platform API changes.

### Observability

No observability changes.

### Database Migrations

No database changes.

### Edge Functions

No edge function changes.

### Frontend Surface Area

No frontend changes.

---

## File Inventory

### New files: 7

| File | Purpose |
|------|---------|
| `_agchain/profiles/__init__.py` | Package init, public exports |
| `_agchain/profiles/types.py` | Pydantic models for all profile types and the composed profile object |
| `_agchain/profiles/registry.py` | Strategy registries (session, state provider, tool) and profile resolution |
| `_agchain/profiles/baseline.py` | Baseline profile definition (Replay_Minimal + Type 0 + No Tools) |
| `_agchain/profiles/strategies/__init__.py` | Strategies sub-package |
| `_agchain/profiles/strategies/session.py` | Session strategy Protocol + Replay_Minimal and Replay_Full stubs |
| `_agchain/profiles/strategies/state_provider.py` | State provider Protocol + Type 0 wrapper around existing `state.py` |

### Modified files: 1

| File | What changes |
|------|-------------|
| `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py` | Accept an optional `profile` argument. Default to `baseline`. Use profile to select session strategy and state provider instead of hardcoded behavior. |

### New test files: 2

| File | Purpose |
|------|---------|
| `_agchain/tests/test_profile_types.py` | Validate Pydantic models serialize/deserialize correctly, forbidden field combinations are rejected |
| `_agchain/tests/test_profile_registry.py` | Validate registration, resolution, baseline profile loads correctly |

---

## Tasks

### Task 1: Define profile type models

**File:** `_agchain/profiles/types.py`

**Step 1:** Write Pydantic models for:
- `SessionStrategyConfig` (strategy_id + parameters dict)
- `StateProviderConfig` (provider_id + parameters dict)
- `ToolStrategyConfig` (strategy_id + parameters dict)
- `SandboxConfig` (optional, type + parameters)
- `ProfileConstraints` (max_tokens_per_step, max_cost_per_run, max_retries_per_step, timeout_per_step_seconds)
- `Profile` (id, name, version, session_strategy, state_provider, tool_strategy, sandbox, constraints)

**Step 2:** Add validators:
- `session_strategy.strategy_id` must be one of `replay_minimal`, `replay_full`.
- `state_provider.provider_id` must be one of `type_0`, `type_i`, `type_ii`, `type_iii`.
- `tool_strategy.strategy_id` must be one of `no_tools`, `standard`, `mcp`.

**Step 3:** Add `model_json_schema()` export so the schema can be rendered by a future UI.

**Test command:** `python -m pytest _agchain/tests/test_profile_types.py -v`
**Expected output:** All type validation tests pass. Invalid combinations rejected with clear errors.

**Commit:** `feat(agchain): define profile type models with Pydantic`

---

### Task 2: Define strategy Protocols

**File:** `_agchain/profiles/strategies/session.py`

**Step 1:** Define `SessionStrategy` Protocol with methods:
- `init_messages(step_def, staged_files, candidate_state) -> list[dict]`
- `update_after_step(step_def, response, candidate_state) -> None`

**Step 2:** Implement `ReplayMinimalStrategy` that delegates to existing `input_assembler.build_messages()`.

**Step 3:** Implement `ReplayFullStrategy` as a stub that raises `NotImplementedError("Replay_Full not yet implemented")`.

**File:** `_agchain/profiles/strategies/state_provider.py`

**Step 4:** Define `StateProvider` Protocol with methods:
- `load(run_dir) -> dict`
- `update(step_id, parsed_output) -> None`
- `save(run_dir) -> None`
- `as_dict() -> dict`

**Step 5:** Implement `Type0Provider` that wraps existing `CandidateState` from `runtime/state.py`.

**Test command:** `python -m pytest _agchain/tests/test_profile_types.py _agchain/tests/test_profile_registry.py -v`
**Expected output:** Strategy implementations pass interface tests.

**Commit:** `feat(agchain): define session and state provider strategy protocols`

---

### Task 3: Build the registry

**File:** `_agchain/profiles/registry.py`

**Step 1:** Create three registries:
- `SESSION_STRATEGIES: dict[str, type[SessionStrategy]]`
- `STATE_PROVIDERS: dict[str, type[StateProvider]]`
- `TOOL_STRATEGIES: dict[str, type[ToolStrategy]]`

**Step 2:** Add `register_session(id, cls)`, `register_state_provider(id, cls)`, `register_tool_strategy(id, cls)` functions.

**Step 3:** Add `resolve_profile(profile: Profile) -> ResolvedProfile` that instantiates the strategy objects from the profile config.

**Step 4:** Add `get_baseline_profile() -> Profile` convenience function.

**File:** `_agchain/profiles/baseline.py`

**Step 5:** Define the baseline profile as a `Profile` instance:
- session: `replay_minimal`
- state: `type_0`
- tools: `no_tools`
- constraints: defaults

**Step 6:** Register baseline strategies on import.

**Test command:** `python -m pytest _agchain/tests/test_profile_registry.py -v`
**Expected output:** Baseline profile resolves. Unknown strategy IDs raise `ValueError`.

**Commit:** `feat(agchain): add profile registry with baseline registration`

---

### Task 4: Wire profile into run_3s.py

**File:** `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`

**Step 1:** Add optional `--profile` CLI argument (path to profile JSON or `baseline`).

**Step 2:** At run start, resolve the profile to strategy instances.

**Step 3:** Replace direct `CandidateState()` construction with `resolved_profile.state_provider`.

**Step 4:** Replace direct `build_messages()` call with `resolved_profile.session_strategy.init_messages()`.

**Step 5:** Verify that running with `--profile baseline` produces identical output to running without `--profile`.

**Test command:** Run the existing 3-step runner with `--profile baseline` against a test EU and diff artifacts against a run without `--profile`.
**Expected output:** Byte-identical `run.jsonl`, `audit_log.jsonl`, `candidate_state.json`.

**Commit:** `feat(agchain): wire profile selection into 3-step runner`

---

### Task 5: Write tests

**File:** `_agchain/tests/test_profile_types.py`

Tests:
1. `Profile` round-trips through JSON serialization.
2. Invalid `strategy_id` values are rejected.
3. `model_json_schema()` produces valid JSON Schema.
4. Baseline profile validates.
5. Profile with `replay_full` + `type_iii` + `mcp` validates (composition is open).

**File:** `_agchain/tests/test_profile_registry.py`

Tests:
1. `get_baseline_profile()` returns a valid profile.
2. `resolve_profile(baseline)` returns working strategy instances.
3. Registering a duplicate strategy ID raises an error.
4. Resolving an unknown strategy ID raises `ValueError`.
5. Type 0 provider wrapper produces the same output as direct `CandidateState` usage.

**Test command:** `python -m pytest _agchain/tests/ -v -k profile`
**Expected output:** All profile tests green.

**Commit:** `test(agchain): add profile type and registry tests`

---

## Completion Criteria

The work is complete only when all of the following are true:

1. `Profile` Pydantic model validates and serializes all 15 profiles from the contract document.
2. `SessionStrategy` and `StateProvider` Protocols are defined with concrete baseline implementations.
3. The registry resolves the baseline profile to working strategy instances.
4. `run_3s.py --profile baseline` produces identical artifacts to the current behavior.
5. All tests pass.
6. No existing runtime helpers are broken or refactored beyond adding the wrapper layer.
7. The profile JSON schema is exportable for future UI consumption.

---

## Explicit Risks

1. **Existing `run_3s.py` has hardcoded imports.** Wiring the profile in may require import-path adjustments. Keep the changes minimal — wrap, don't rewrite.
2. **Pydantic v2 may not be installed in `_agchain` yet.** Check `pyproject.toml` and add if missing.
3. **Type 0 wrapper must preserve exact sanitization behavior.** The wrapper delegates to `CandidateState`, it does not reimplement sanitization logic.
4. **Replay_Full is defined but not implemented.** This plan stubs it. A subsequent plan implements it.
5. **Tool strategies are defined as types only.** No tool execution is wired in this plan. That depends on Inspect AI integration (separate plan).

# Profile Implementation Bugfix Plan

**Goal:** Fix three bugs found during post-implementation review of Plan B. No scope expansion — only the three identified issues are addressed.

**Architecture:** All changes are in `run_3s.py` and `test_profile_registry.py`. The profile package files (`types.py`, `registry.py`, `baseline.py`, `strategies/`) are not modified. The frozen seam contract on the 6 runtime helpers remains in force.

**Tech Stack:** Python 3.10+, existing profile package, pytest.

**Status:** Draft
**Author:** AI worker
**Date:** 2026-03-27

---

## Bugs

### Bug 1: Per-EU state leakage (Critical)

`resolved` is built once in `main()` with a single `CandidateState()`. The same `resolved_profile.state` is reused across every `run_single_eu()` call. The baseline path creates a fresh `CandidateState()` per EU. State from EU 1 leaks into EU 2.

**Fix:** Do not pass a pre-instantiated state provider. Instead, pass the `Profile` object and the `build_messages` function into `run_single_eu()`, and resolve fresh strategy instances per EU inside that function.

### Bug 2: Custom profile JSON path skips registry (Significant)

When `args.profile` is a file path (not `"baseline"`), the code skips `get_baseline_profile()`, which is the only import that triggers `import profiles.baseline`. That module's side effects register `replay_minimal`, `replay_full`, `type_0`, and `no_tools` into the registries. Without those registrations, `resolve_profile()` raises `ValueError: Unknown session strategy`.

**Fix:** Always import `profiles.baseline` when `--profile` is provided, regardless of whether the value is `"baseline"` or a file path.

### Bug 3: Artifact identity unverified (Significant)

The plan's completion criterion #5 requires byte-identical artifacts between `--profile baseline` and the legacy path. This was never proven.

**Fix:** Two-layer verification:
1. A unit test proving message-assembly equivalence (mock data, no API credentials needed).
2. A unit test proving per-EU state isolation (two sequential EU simulations produce independent state).
3. A runner-level verification step: if a test EU is available, run `--profile baseline` vs legacy and diff artifacts. If no test EU is available, document the gap explicitly.

---

## Pre-Implementation Contract

No major decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

### Locked Decisions

1. Only `run_3s.py` and `test_profile_registry.py` are modified. No other files.
2. The 6 runtime helpers remain untouched: `state.py` (66 lines), `input_assembler.py` (132 lines), `payload_gate.py` (29 lines), `audit.py` (68 lines), `staging.py` (55 lines), `model_adapter.py` (124 lines).
3. The 7 profile package files remain untouched: `__init__.py`, `types.py`, `registry.py`, `baseline.py`, `strategies/__init__.py`, `strategies/session.py`, `strategies/state_provider.py`.
4. The `--profile` flag remains opt-in. When absent, the legacy code path executes with zero behavioral change.
5. `resolve_profile()` is called per-EU, not per-run. Each call receives a fresh `CandidateState()`.
6. `import profiles.baseline` is the mechanism that populates the strategy registries. This import must happen before any `resolve_profile()` call, regardless of whether the profile is `"baseline"` or a custom JSON path.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. A custom profile JSON file containing `{"id": "test", "name": "Test", "session_strategy": {"strategy_id": "replay_minimal"}, "state_provider": {"provider_id": "type_0"}, "tool_strategy": {"strategy_id": "no_tools"}}` resolves without `ValueError`.
2. Two sequential calls to `run_single_eu()` with `--profile baseline` produce independent `CandidateState` instances — the second EU's state does not contain the first EU's step outputs.
3. `ReplayMinimalStrategy.init_messages()` produces byte-identical output to `build_messages()` for the same inputs.
4. All 12 existing profile tests still pass.
5. The 2 existing IRAC tests still pass.
6. If a test EU directory is available, `--profile baseline` and legacy path produce identical `run.jsonl` structure (excluding timestamps and UUIDs). If no test EU is available, this is documented as an unverified criterion.

---

## Manifest

### Platform API
No changes.

### Observability
No changes.

### Database Migrations
No changes.

### Edge Functions
No changes.

### Frontend Surface Area
No changes.

---

## File Inventory

### Modified files: `2`

| File | What changes |
|------|-------------|
| `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py` | Fix state lifecycle (per-EU resolution) and registry import (always import baseline) |
| `_agchain/legal-10/tests/test_profile_registry.py` | Add message-assembly equivalence test and state-isolation test |

### New files: `0`

---

## Tasks

### Task 1: Fix registry import and per-EU state lifecycle in run_3s.py

**File:** `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`

Both Bug 1 and Bug 2 are fixed together because they affect the same code block.

**Step 1:** Replace the profile resolution block in `main()`. Change from:

```python
resolved = None
if args.profile is not None:
    _agchain_root = Path(__file__).resolve().parents[3]
    sys.path.insert(0, str(_agchain_root))

    from profiles.registry import get_baseline_profile, resolve_profile
    from profiles.types import Profile
    from runtime.state import CandidateState as _CS
    from runtime.input_assembler import build_messages as _bm

    if args.profile == "baseline":
        profile = get_baseline_profile()
    else:
        profile = Profile.model_validate_json(Path(args.profile).read_text())

    resolved = resolve_profile(
        profile,
        build_messages_fn=_bm,
        candidate_state=_CS(),
    )
```

Change to:

```python
_profile_obj = None
_bm_fn = None
if args.profile is not None:
    _agchain_root = Path(__file__).resolve().parents[3]
    sys.path.insert(0, str(_agchain_root))

    from profiles.registry import get_baseline_profile
    from profiles.types import Profile
    import profiles.baseline  # noqa: F401 — triggers strategy registration
    from runtime.input_assembler import build_messages as _bm

    _bm_fn = _bm
    if args.profile == "baseline":
        _profile_obj = get_baseline_profile()
    else:
        _profile_obj = Profile.model_validate_json(Path(args.profile).read_text())
```

**Step 2:** Change `run_single_eu()` signature. Replace `resolved_profile: Any = None` with:

```python
    profile: Any = None,
    build_messages_fn: Any = None,
```

**Step 3:** Replace state initialization in `run_single_eu()`. Change from:

```python
    if resolved_profile is not None:
        state = resolved_profile.state
    else:
        state = CandidateState()
```

Change to:

```python
    _session = None
    if profile is not None:
        from profiles.registry import resolve_profile
        _resolved = resolve_profile(
            profile,
            build_messages_fn=build_messages_fn,
            candidate_state=CandidateState(),
        )
        state = _resolved.state
        _session = _resolved.session
    else:
        state = CandidateState()
```

**Step 4:** Replace message assembly conditional. Change from:

```python
        if resolved_profile is not None:
            messages = resolved_profile.session.init_messages(
```

Change to:

```python
        if _session is not None:
            messages = _session.init_messages(
```

**Step 5:** Update the call site in `main()`. Change from:

```python
            run_single_eu(
                benchmark_dir=args.benchmark_dir,
                eu_dir=eu_dir,
                runs_dir=args.runs_dir,
                eval_adapter=eval_adapter,
                judge_adapter=judge_adapter,
                run_id=run_id,
                resolved_profile=resolved,
            )
```

Change to:

```python
            run_single_eu(
                benchmark_dir=args.benchmark_dir,
                eu_dir=eu_dir,
                runs_dir=args.runs_dir,
                eval_adapter=eval_adapter,
                judge_adapter=judge_adapter,
                run_id=run_id,
                profile=_profile_obj,
                build_messages_fn=_bm_fn,
            )
```

**Step 6:** Verify `--help` still works:

```bash
cd _agchain/legal-10/runspecs/3-STEP-RUN && python run_3s.py --help
```

**Expected output:** Help text includes `--profile` argument. No import errors.

**Verification command:**
```powershell
cd _agchain/legal-10/runspecs/3-STEP-RUN; (python run_3s.py --help 2>&1 | Select-String "profile").Count
```
**Expected output:** `1` (one line containing "profile")

**Commit:** `fix(agchain): per-EU state lifecycle and registry import for profile paths`

---

### Task 2: Add equivalence and state-isolation tests

**File:** `_agchain/legal-10/tests/test_profile_registry.py`

**Step 1:** Add `TestBaselineEquivalence` class with two tests:

```python
class TestBaselineEquivalence:
    def test_init_messages_matches_build_messages(self) -> None:
        """Baseline profile produces identical messages to direct build_messages()."""
        from legal_10_runtime_stub import build_messages, CandidateState

        step_def = {"prompt_template": "Test prompt {p1.anchor.text}"}
        payloads = {"p1": {"content": {"anchor": {"text": "test anchor"}}}}
        candidate_state = {}
        system_message = "You are a legal analyst."

        direct = build_messages(
            step_def=step_def,
            payloads=payloads,
            candidate_state=candidate_state,
            system_message=system_message,
        )

        p = get_baseline_profile()
        resolved = resolve_profile(
            p,
            build_messages_fn=build_messages,
            candidate_state=CandidateState(),
        )
        via_profile = resolved.session.init_messages(
            step_def=step_def,
            payloads=payloads,
            candidate_state=candidate_state,
            system_message=system_message,
        )

        assert direct == via_profile

    def test_per_eu_state_isolation(self) -> None:
        """Each resolve_profile() call gets independent state."""
        from legal_10_runtime_stub import build_messages, CandidateState

        p = get_baseline_profile()

        # Simulate EU 1
        resolved_1 = resolve_profile(
            p,
            build_messages_fn=build_messages,
            candidate_state=CandidateState(),
        )
        resolved_1.state.update("d1", {"answer": "eu1_answer"})

        # Simulate EU 2 — fresh resolve
        resolved_2 = resolve_profile(
            p,
            build_messages_fn=build_messages,
            candidate_state=CandidateState(),
        )

        # EU 2 state must be empty — no leakage from EU 1
        assert resolved_2.state.as_dict() == {}
        # EU 1 state must still have its data
        assert "d1" in resolved_1.state.as_dict()
```

**Step 2:** Run the tests:

```bash
cd _agchain/legal-10 && python -m pytest tests/test_profile_registry.py -v
```

**Expected output:** All tests pass, including the two new ones.

**Step 3:** Run all profile tests to verify no regressions:

```bash
cd _agchain/legal-10 && python -m pytest tests/test_profile_types.py tests/test_profile_registry.py -v
```

**Expected output:** All tests pass (original 12 + 2 new = 14 total).

**Verification command:**
```powershell
cd _agchain/legal-10; python -m pytest tests/test_profile_types.py tests/test_profile_registry.py -v 2>&1 | Select-Object -Last 1
```
**Expected output:** Line containing `14 passed`

**Commit:** `test(agchain): add baseline equivalence and state-isolation tests`

---

### Task 3: Run full test suite and verify no regressions

**Step 1:** Run all tests in the test directory:

```bash
cd _agchain/legal-10 && python -m pytest tests/ -v
```

**Expected output:** 14 new/existing profile + IRAC tests pass. 3 citation-integrity tests fail (pre-existing stale-path issue, not introduced by this plan).

**Step 2:** Check for test EU availability and run artifact comparison if possible:

```powershell
Get-ChildItem _agchain/datasets/eus/legal10_3step_v1/eus/ -ErrorAction SilentlyContinue | Select-Object -First 3
```

If a test EU directory exists, run both paths and compare structure (excluding timestamps/UUIDs). If no test EU exists, document: "Artifact identity criterion remains unverified at runner level due to no test EU being available. Unit-level equivalence is proven."

**Commit:** `chore(agchain): verify bugfix — all tests pass, no regressions`

---

## Completion Criteria

1. Custom profile JSON resolves without `ValueError` (registry populated by `import profiles.baseline`).
2. Each EU gets a fresh `CandidateState` — verified by `test_per_eu_state_isolation`.
3. Message-assembly equivalence proven by `test_init_messages_matches_build_messages`.
4. All 14 profile tests pass (12 original + 2 new).
5. The 2 existing IRAC tests still pass.
6. Runner-level artifact identity: verified if test EU available, documented as gap if not.

## Explicit Risks

1. **Runner-level artifact identity may remain unverified** if no test EU is available on disk. The unit-level equivalence and state-isolation tests prove the code paths are functionally identical, but byte-level artifact identity requires a real run. This is accepted — the unit tests are sufficient to unblock approval, and artifact identity can be verified on the first real benchmark run.

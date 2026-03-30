# Profile Types and Registry Implementation Plan

**Goal:** Formalize the runtime/environment contract inventory as typed Python objects with a strategy registry, then wire the composed profile object into the existing 3-step runner so that run configuration is explicit rather than hardcoded. This is the prerequisite for Inspect AI integration (separate subsequent plan).

**Architecture:** New `_agchain/profiles/` package contains Pydantic models for profile types and a registry for session strategies, state providers, and tool strategies. The existing runtime helpers (`state.py`, `input_assembler.py`, `payload_gate.py`, `audit.py`, `staging.py`) are not rewritten. They become the concrete implementations behind the baseline profile. `run_3s.py` accepts a profile argument and delegates to resolved strategy instances instead of direct imports.

**Tech Stack:** Python 3.10+, Pydantic v2 (already in `requirements.txt`), pytest.

**Status:** Draft
**Author:** AI worker
**Date:** 2026-03-27

---

## Manifest

### Platform API

No platform API changes.

This plan creates Python types and a registry inside `_agchain/`. It does not touch `services/platform-api/`. The profile types will be consumed by platform-api in a future plan when benchmark run submission is API-triggered.

### Observability

No OpenTelemetry traces, metrics, or structured logs are introduced.

Justification: this plan formalizes existing runtime behavior into typed objects. The existing runtime already produces `audit_log.jsonl` and `run.jsonl`. Those artifact contracts are unchanged. OTel integration for benchmark execution is a separate future concern that depends on the Inspect AI integration plan.

### Database Migrations

No database changes.

The profile types are Python-only runtime objects. Profile persistence (if needed later) would be a separate plan.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

No frontend changes.

---

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. Profile types are Pydantic v2 models. This gives JSON schema export for future UI rendering and strict validation.
2. The registry uses a simple `dict[str, type]` mapping. Strategies register by calling `register()`. No metaclass magic, no plugin discovery.
3. The existing runtime helpers are NOT refactored. They are wrapped as the baseline implementations of the Type 0 state provider and Replay_Minimal session strategy.
4. The composed profile object references one session strategy + one state provider + one tool strategy by ID, with strategy-specific parameters.
5. `run_3s.py` accepts an optional profile (path to JSON or `"baseline"`). The current hardcoded behavior becomes the `baseline` profile.
6. No Inspect AI integration in this plan. That is a separate subsequent plan.
7. The `_agchain/profiles/` package is created at the `_agchain/` level, not inside `legal-10/`, because profiles are a platform concept, not a benchmark-package concept.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. `from profiles.types import Profile` works from within `_agchain/`.
2. `Profile(session_strategy=..., state_provider=..., tool_strategy=...)` validates and rejects invalid strategy IDs.
3. `Profile.model_json_schema()` produces valid JSON Schema.
4. The baseline profile resolves to working strategy instances that delegate to the existing `CandidateState` and `build_messages`.
5. `python run_3s.py --profile baseline ...` produces byte-identical `run.jsonl`, `audit_log.jsonl`, and `candidate_state.json` compared to a run without `--profile`.
6. All new tests pass. No existing tests are broken.

### Locked Inventory Counts

#### Python packages

- New packages: `1` (`_agchain/profiles/`)
- New sub-packages: `1` (`_agchain/profiles/strategies/`)

#### New files: `10`

| File | Purpose |
|------|---------|
| `_agchain/profiles/__init__.py` | Package init, public exports |
| `_agchain/profiles/types.py` | Pydantic models for profile, strategy configs, constraints |
| `_agchain/profiles/registry.py` | Strategy registries and profile resolution |
| `_agchain/profiles/baseline.py` | Baseline profile definition and strategy registration |
| `_agchain/profiles/strategies/__init__.py` | Strategies sub-package init |
| `_agchain/profiles/strategies/session.py` | Session strategy Protocol + ReplayMinimal implementation |
| `_agchain/profiles/strategies/state_provider.py` | State provider Protocol + Type0 wrapper |
| `_agchain/legal-10/tests/test_profile_types.py` | Type validation tests |
| `_agchain/legal-10/tests/test_profile_registry.py` | Registry and resolution tests |
| `_agchain/legal-10/tests/legal_10_runtime_stub.py` | Import helper for test isolation from runner internals |

#### Modified files: `1`

| File | What changes |
|------|-------------|
| `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py` | Add optional `--profile` argument. When provided, resolve profile and use strategy instances. When absent, behavior is identical to current code. |

### Locked File Inventory

#### New files

- `_agchain/profiles/__init__.py`
- `_agchain/profiles/types.py`
- `_agchain/profiles/registry.py`
- `_agchain/profiles/baseline.py`
- `_agchain/profiles/strategies/__init__.py`
- `_agchain/profiles/strategies/session.py`
- `_agchain/profiles/strategies/state_provider.py`
- `_agchain/legal-10/tests/test_profile_types.py`
- `_agchain/legal-10/tests/test_profile_registry.py`
- `_agchain/legal-10/tests/legal_10_runtime_stub.py`

#### Modified files

- `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`

---

## Frozen Seam Contract

### Existing runtime helpers must not change behavior

The existing files under `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/` are the active baseline. This plan wraps them; it does not modify them.

- `state.py` (66 lines) — `CandidateState` class is wrapped by `Type0Provider`, not replaced.
- `input_assembler.py` (132 lines) — `build_messages()` is called by `ReplayMinimalStrategy`, not replaced.
- `payload_gate.py` (29 lines) — `get_admitted_payloads()` is unchanged.
- `audit.py` (68 lines) — `hash_file()`, `hash_bytes()`, `emit_audit_record()`, `emit_run_record()` are unchanged.
- `staging.py` (55 lines) — `create_staging()`, `stage_files()`, `cleanup_staging()` are unchanged.
- `model_adapter.py` (124 lines) — `ModelAdapter`, `create_adapter()` are unchanged.

Do not refactor these files. Do not move them. Do not rename their functions. The wrappers adapt the calling convention; the implementations stay put.

### Profile wiring in run_3s.py must be opt-in

When `--profile` is NOT provided, `run_3s.py` must execute its existing code path with zero behavioral change. The profile wiring is additive — a new code path that the `--profile` flag activates. This prevents breaking the current runner during development.

---

## Explicit Risks Accepted In This Plan

1. **Import path complexity.** `_agchain/profiles/` is a sibling of `_agchain/legal-10/`. The runner in `legal-10/runspecs/3-STEP-RUN/` will need `sys.path` manipulation or a relative import strategy to reach `profiles/`. This is acceptable because `run_3s.py` already manipulates `sys.path` for its own imports. The profiles package uses absolute imports (`from profiles.types import ...`) which requires `_agchain/` to be on `sys.path`. This is a conscious convention choice consistent with the existing runner.
2. **Test stub transitive imports.** `legal_10_runtime_stub.py` imports `runtime.input_assembler` and `runtime.state` at module level. These modules currently import only stdlib (`json`, `copy`, `Path`) and have no side effects. If future changes to those modules add API client initialization or env loading at import time, the test stub will need to be updated to mock those imports. Verify the stub imports cleanly in a bare environment during Task 5.
3. **Replay_Full is stubbed.** The `ReplayFullStrategy` raises `NotImplementedError`. This is intentional — it is defined in the contract but not yet active. A subsequent plan implements it.
4. **Tool strategies are type-only.** No tool execution is wired. `NoToolsStrategy` is a pass-through. `StandardToolsStrategy` and `McpToolsStrategy` raise `NotImplementedError`. Tool execution depends on Inspect AI integration.
5. **No profile persistence.** Profiles exist as Python objects and JSON files on disk. There is no database storage. If the platform later needs to store profiles in Postgres, that is a separate plan.

---

## Completion Criteria

The work is complete only when all of the following are true:

1. The `_agchain/profiles/` package exists with the 7 profile package files listed in the inventory.
2. The 3 test files (`test_profile_types.py`, `test_profile_registry.py`, `legal_10_runtime_stub.py`) exist in `_agchain/legal-10/tests/`.
3. `Profile` Pydantic model validates and serializes all strategy combinations from the contract inventory.
4. The baseline profile (`replay_minimal` + `type_0` + `no_tools`) resolves to working strategy instances.
5. `run_3s.py --profile baseline` produces identical artifacts to the current behavior (verified by diffing `run.jsonl`, `audit_log.jsonl`, `candidate_state.json`).
6. The 2 new test files pass. The test stub imports cleanly without requiring API credentials or environment variables.
7. The 2 existing test files still pass.
8. `Profile.model_json_schema()` produces valid JSON Schema exportable for future UI consumption.

---

## Tasks

### Task 1: Create profile package structure

**File(s):** `_agchain/profiles/__init__.py`, `_agchain/profiles/strategies/__init__.py`

**Step 1:** Create directory `_agchain/profiles/`.
**Step 2:** Create directory `_agchain/profiles/strategies/`.
**Step 3:** Create `_agchain/profiles/__init__.py` with:
```python
from profiles.types import (
    Profile,
    SessionStrategyConfig,
    StateProviderConfig,
    ToolStrategyConfig,
    ProfileConstraints,
)
from profiles.registry import resolve_profile, get_baseline_profile
```
**Step 4:** Create `_agchain/profiles/strategies/__init__.py` as empty file.
**Step 5:** Verify import works: `cd _agchain && python -c "import profiles"`.

**Test command:** `cd _agchain && python -c "import profiles; print('ok')"`
**Expected output:** `ok`

**Commit:** `feat(agchain): create profiles package structure`

---

### Task 2: Define profile type models

**File(s):** `_agchain/profiles/types.py`

**Step 1:** Write `_agchain/profiles/types.py` with the following Pydantic models:

```python
from __future__ import annotations
from pydantic import BaseModel, field_validator
from typing import Any, Literal


class SessionStrategyConfig(BaseModel):
    strategy_id: Literal["replay_minimal", "replay_full"]
    parameters: dict[str, Any] = {}


class StateProviderConfig(BaseModel):
    provider_id: Literal["type_0", "type_i", "type_ii", "type_iii"]
    parameters: dict[str, Any] = {}


class ToolStrategyConfig(BaseModel):
    strategy_id: Literal["no_tools", "standard", "mcp"]
    parameters: dict[str, Any] = {}
    tool_filter: list[str] | None = None


class ProfileConstraints(BaseModel):
    max_tokens_per_step: int | None = None
    max_cost_per_run: float | None = None
    max_retries_per_step: int = 3
    timeout_per_step_seconds: int = 300
    max_connections: int | None = None
    max_tool_output: int | None = None
    max_sandboxes: int | None = None


class Profile(BaseModel):
    id: str
    name: str
    version: str = "1.0.0"
    session_strategy: SessionStrategyConfig
    state_provider: StateProviderConfig
    tool_strategy: ToolStrategyConfig
    constraints: ProfileConstraints = ProfileConstraints()
    cache_policy: Literal["disabled", "read", "write", "read_write"] = "disabled"
    compaction: Literal[
        "auto", "native", "summary", "edit", "trim", "none"
    ] = "none"
    compaction_threshold: float | None = None
```

**Step 2:** Verify the model validates:
```bash
cd _agchain && python -c "
from profiles.types import Profile, SessionStrategyConfig, StateProviderConfig, ToolStrategyConfig
p = Profile(
    id='baseline', name='Baseline',
    session_strategy=SessionStrategyConfig(strategy_id='replay_minimal'),
    state_provider=StateProviderConfig(provider_id='type_0'),
    tool_strategy=ToolStrategyConfig(strategy_id='no_tools'),
)
print(p.model_dump_json(indent=2))
"
```

**Step 3:** Verify invalid strategy ID is rejected:
```bash
cd _agchain && python -c "
from profiles.types import SessionStrategyConfig
try:
    SessionStrategyConfig(strategy_id='invalid')
    print('FAIL: should have raised')
except Exception as e:
    print(f'OK: {e}')
"
```

**Step 4:** Verify JSON schema export:
```bash
cd _agchain && python -c "
from profiles.types import Profile
import json
schema = Profile.model_json_schema()
print(json.dumps(schema, indent=2)[:200])
print('...schema valid')
"
```

**Test command:** All three verification commands above.
**Expected output:** Valid JSON, rejection of invalid ID, schema export.

**Commit:** `feat(agchain): define profile Pydantic type models`

---

### Task 3: Define strategy Protocols

**File(s):** `_agchain/profiles/strategies/session.py`, `_agchain/profiles/strategies/state_provider.py`

**Step 1:** Write `_agchain/profiles/strategies/session.py`:

```python
from __future__ import annotations
from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class SessionStrategy(Protocol):
    def init_messages(
        self,
        step_def: dict[str, Any],
        payloads: dict[str, dict[str, Any]],
        candidate_state: dict[str, Any],
        system_message: str,
    ) -> list[dict[str, str]]:
        ...

    def update_after_step(
        self,
        step_def: dict[str, Any],
        response: dict[str, Any],
    ) -> None:
        ...


class ReplayMinimalStrategy:
    """Wraps existing input_assembler.build_messages() as a SessionStrategy."""

    def __init__(self, build_messages_fn: Any) -> None:
        self._build_messages = build_messages_fn

    def init_messages(
        self,
        step_def: dict[str, Any],
        payloads: dict[str, dict[str, Any]],
        candidate_state: dict[str, Any],
        system_message: str,
    ) -> list[dict[str, str]]:
        return self._build_messages(
            step_def=step_def,
            payloads=payloads,
            candidate_state=candidate_state,
            system_message=system_message,
        )

    def update_after_step(
        self,
        step_def: dict[str, Any],
        response: dict[str, Any],
    ) -> None:
        pass  # Replay_Minimal has no inter-step session state


class ReplayFullStrategy:
    """Placeholder. Replay_Full is defined but not yet implemented."""

    def init_messages(self, *args: Any, **kwargs: Any) -> list[dict[str, str]]:
        raise NotImplementedError("Replay_Full is defined but not yet implemented")

    def update_after_step(self, *args: Any, **kwargs: Any) -> None:
        raise NotImplementedError("Replay_Full is defined but not yet implemented")
```

**Step 2:** Write `_agchain/profiles/strategies/state_provider.py`:

```python
from __future__ import annotations
from pathlib import Path
from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class StateProvider(Protocol):
    def update(self, step_id: str, output: dict[str, Any]) -> None:
        ...

    def as_dict(self) -> dict[str, Any]:
        ...

    def save(self, path: Path) -> None:
        ...


class Type0Provider:
    """Wraps existing CandidateState as a StateProvider."""

    def __init__(self, candidate_state: Any) -> None:
        self._state = candidate_state

    def update(self, step_id: str, output: dict[str, Any]) -> None:
        self._state.update(step_id, output)

    def as_dict(self) -> dict[str, Any]:
        return self._state.as_dict()

    def save(self, path: Path) -> None:
        self._state.save(path)
```

**Step 3:** Verify Protocols are satisfied:
```bash
cd _agchain && python -c "
from profiles.strategies.session import SessionStrategy, ReplayMinimalStrategy
from profiles.strategies.state_provider import StateProvider, Type0Provider
print('SessionStrategy is Protocol:', hasattr(SessionStrategy, '__protocol_attrs__'))
print('imports ok')
"
```

**Test command:** Verification command above.
**Expected output:** `imports ok`

**Commit:** `feat(agchain): define session and state provider strategy protocols`

---

### Task 4: Build the registry

**File(s):** `_agchain/profiles/registry.py`, `_agchain/profiles/baseline.py`

**Step 1:** Write `_agchain/profiles/registry.py`:

```python
from __future__ import annotations
from typing import Any

from profiles.types import Profile
from profiles.strategies.session import SessionStrategy
from profiles.strategies.state_provider import StateProvider


SESSION_STRATEGIES: dict[str, type] = {}
STATE_PROVIDERS: dict[str, type] = {}
TOOL_STRATEGIES: dict[str, type] = {}


def register_session(strategy_id: str, cls: type) -> None:
    if strategy_id in SESSION_STRATEGIES:
        raise ValueError(f"Session strategy '{strategy_id}' already registered")
    SESSION_STRATEGIES[strategy_id] = cls


def register_state_provider(provider_id: str, cls: type) -> None:
    if provider_id in STATE_PROVIDERS:
        raise ValueError(f"State provider '{provider_id}' already registered")
    STATE_PROVIDERS[provider_id] = cls


def register_tool_strategy(strategy_id: str, cls: type) -> None:
    if strategy_id in TOOL_STRATEGIES:
        raise ValueError(f"Tool strategy '{strategy_id}' already registered")
    TOOL_STRATEGIES[strategy_id] = cls


class ResolvedProfile:
    """A profile with instantiated strategy objects."""

    def __init__(
        self,
        profile: Profile,
        session: SessionStrategy,
        state: StateProvider,
    ) -> None:
        self.profile = profile
        self.session = session
        self.state = state


def resolve_profile(
    profile: Profile,
    *,
    build_messages_fn: Any = None,
    candidate_state: Any = None,
) -> ResolvedProfile:
    sid = profile.session_strategy.strategy_id
    if sid not in SESSION_STRATEGIES:
        raise ValueError(f"Unknown session strategy: {sid}")

    pid = profile.state_provider.provider_id
    if pid not in STATE_PROVIDERS:
        raise ValueError(f"Unknown state provider: {pid}")

    session_cls = SESSION_STRATEGIES[sid]
    state_cls = STATE_PROVIDERS[pid]

    if build_messages_fn is not None:
        session = session_cls(build_messages_fn)
    else:
        session = session_cls()

    if candidate_state is not None:
        state = state_cls(candidate_state)
    else:
        state = state_cls()

    return ResolvedProfile(profile=profile, session=session, state=state)


def get_baseline_profile() -> Profile:
    from profiles.baseline import BASELINE_PROFILE
    return BASELINE_PROFILE
```

**Step 2:** Write `_agchain/profiles/baseline.py`:

```python
from __future__ import annotations

from profiles.types import (
    Profile,
    SessionStrategyConfig,
    StateProviderConfig,
    ToolStrategyConfig,
    ProfileConstraints,
)
from profiles.registry import (
    register_session,
    register_state_provider,
    register_tool_strategy,
)
from profiles.strategies.session import (
    ReplayMinimalStrategy,
    ReplayFullStrategy,
)
from profiles.strategies.state_provider import Type0Provider


# --- Register baseline strategies ---

register_session("replay_minimal", ReplayMinimalStrategy)
register_session("replay_full", ReplayFullStrategy)
register_state_provider("type_0", Type0Provider)


# --- No-op tool strategy for the baseline ---

class NoToolsStrategy:
    """No tools available. Pass-through."""
    pass


register_tool_strategy("no_tools", NoToolsStrategy)


# --- The baseline profile ---

BASELINE_PROFILE = Profile(
    id="baseline",
    name="Baseline (3-Step MVP)",
    version="1.0.0",
    session_strategy=SessionStrategyConfig(strategy_id="replay_minimal"),
    state_provider=StateProviderConfig(provider_id="type_0"),
    tool_strategy=ToolStrategyConfig(strategy_id="no_tools"),
    constraints=ProfileConstraints(),
    cache_policy="disabled",
    compaction="none",
)
```

**Step 3:** Verify resolution works:
```bash
cd _agchain && python -c "
from profiles.registry import get_baseline_profile, resolve_profile
p = get_baseline_profile()
print(f'Profile: {p.id} / {p.name}')
print(f'Session: {p.session_strategy.strategy_id}')
print(f'State: {p.state_provider.provider_id}')
print(f'Tools: {p.tool_strategy.strategy_id}')
"
```

**Test command:** Verification command above.
**Expected output:** Prints baseline profile fields.

**Commit:** `feat(agchain): add profile registry with baseline registration`

---

### Task 5: Write tests for types and registry

**File(s):** `_agchain/legal-10/tests/test_profile_types.py`, `_agchain/legal-10/tests/test_profile_registry.py`

**Step 1:** Write `_agchain/legal-10/tests/test_profile_types.py`:

```python
"""Tests for profile Pydantic type models."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

# Add _agchain to path so profiles package is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[2].parent))

from profiles.types import (
    Profile,
    SessionStrategyConfig,
    StateProviderConfig,
    ToolStrategyConfig,
    ProfileConstraints,
)


def _make_baseline() -> Profile:
    return Profile(
        id="baseline",
        name="Baseline",
        session_strategy=SessionStrategyConfig(strategy_id="replay_minimal"),
        state_provider=StateProviderConfig(provider_id="type_0"),
        tool_strategy=ToolStrategyConfig(strategy_id="no_tools"),
    )


class TestProfileValidation:
    def test_baseline_validates(self) -> None:
        p = _make_baseline()
        assert p.id == "baseline"
        assert p.session_strategy.strategy_id == "replay_minimal"

    def test_invalid_session_strategy_rejected(self) -> None:
        with pytest.raises(Exception):
            SessionStrategyConfig(strategy_id="invalid")

    def test_invalid_state_provider_rejected(self) -> None:
        with pytest.raises(Exception):
            StateProviderConfig(provider_id="invalid")

    def test_invalid_tool_strategy_rejected(self) -> None:
        with pytest.raises(Exception):
            ToolStrategyConfig(strategy_id="invalid")

    def test_open_composition_validates(self) -> None:
        """replay_full + type_iii + mcp is a valid combination."""
        p = Profile(
            id="advanced",
            name="Advanced",
            session_strategy=SessionStrategyConfig(strategy_id="replay_full"),
            state_provider=StateProviderConfig(provider_id="type_iii"),
            tool_strategy=ToolStrategyConfig(strategy_id="mcp"),
        )
        assert p.session_strategy.strategy_id == "replay_full"


class TestProfileSerialization:
    def test_json_roundtrip(self) -> None:
        p = _make_baseline()
        dumped = p.model_dump_json()
        loaded = Profile.model_validate_json(dumped)
        assert loaded.id == p.id
        assert loaded.session_strategy.strategy_id == p.session_strategy.strategy_id

    def test_json_schema_export(self) -> None:
        schema = Profile.model_json_schema()
        assert "properties" in schema
        assert "session_strategy" in schema["properties"]
        # Verify it is valid JSON
        json.dumps(schema)

    def test_constraints_defaults(self) -> None:
        p = _make_baseline()
        assert p.constraints.max_retries_per_step == 3
        assert p.constraints.timeout_per_step_seconds == 300
        assert p.cache_policy == "disabled"
        assert p.compaction == "none"
```

**Step 2:** Write `_agchain/legal-10/tests/test_profile_registry.py`:

```python
"""Tests for profile registry and resolution."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2].parent))

from profiles.registry import (
    get_baseline_profile,
    resolve_profile,
    SESSION_STRATEGIES,
    STATE_PROVIDERS,
)
from profiles.strategies.session import SessionStrategy, ReplayMinimalStrategy
from profiles.strategies.state_provider import StateProvider, Type0Provider
from profiles.types import Profile, SessionStrategyConfig, StateProviderConfig, ToolStrategyConfig


class TestBaselineProfile:
    def test_baseline_loads(self) -> None:
        p = get_baseline_profile()
        assert p.id == "baseline"
        assert p.session_strategy.strategy_id == "replay_minimal"
        assert p.state_provider.provider_id == "type_0"
        assert p.tool_strategy.strategy_id == "no_tools"

    def test_baseline_resolves(self) -> None:
        from legal_10_runtime_stub import build_messages, CandidateState

        p = get_baseline_profile()
        resolved = resolve_profile(
            p,
            build_messages_fn=build_messages,
            candidate_state=CandidateState(),
        )
        assert isinstance(resolved.session, ReplayMinimalStrategy)
        assert isinstance(resolved.state, Type0Provider)


class TestRegistryErrors:
    def test_unknown_session_strategy_raises(self) -> None:
        p = Profile(
            id="bad",
            name="Bad",
            session_strategy=SessionStrategyConfig(strategy_id="replay_minimal"),
            state_provider=StateProviderConfig(provider_id="type_0"),
            tool_strategy=ToolStrategyConfig(strategy_id="no_tools"),
        )
        # Temporarily remove replay_minimal to test error
        saved = SESSION_STRATEGIES.pop("replay_minimal")
        try:
            with pytest.raises(ValueError, match="Unknown session strategy"):
                resolve_profile(p)
        finally:
            SESSION_STRATEGIES["replay_minimal"] = saved

    def test_strategies_are_registered(self) -> None:
        assert "replay_minimal" in SESSION_STRATEGIES
        assert "replay_full" in SESSION_STRATEGIES
        assert "type_0" in STATE_PROVIDERS
```

**Step 3:** Create a tiny test stub so registry tests can resolve without the full runner:

```python
# _agchain/legal-10/tests/legal_10_runtime_stub.py
"""Minimal stubs for registry tests that need runtime callables."""
from __future__ import annotations
import sys
from pathlib import Path

# Add the 3-STEP-RUN directory to path
_run_dir = Path(__file__).resolve().parents[1] / "runspecs" / "3-STEP-RUN"
sys.path.insert(0, str(_run_dir))

from runtime.input_assembler import build_messages  # noqa: F401
from runtime.state import CandidateState  # noqa: F401
```

**Step 4:** Run the tests:
```bash
cd _agchain/legal-10 && python -m pytest tests/test_profile_types.py tests/test_profile_registry.py -v
```

**Test command:** `cd _agchain/legal-10 && python -m pytest tests/test_profile_types.py tests/test_profile_registry.py -v`
**Expected output:** All tests pass.

**Commit:** `test(agchain): add profile type and registry tests`

---

### Task 6: Wire profile into run_3s.py

**File(s):** `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`

**Step 1:** Add `--profile` argument to the argparse block in `main()`. The argument is optional and defaults to `None`:

```python
parser.add_argument(
    "--profile",
    type=str,
    default=None,
    help="Profile ID ('baseline') or path to profile JSON. If omitted, uses legacy code path.",
)
```

**Step 2:** At the top of `main()`, after argument parsing, add profile resolution:

```python
resolved = None
if args.profile is not None:
    # Add _agchain root to path for profiles package
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

**Step 3:** In `run_single_eu()`, when `resolved` is not None, use the resolved strategies:

- Replace `CandidateState()` with `resolved.state` (already instantiated).
- Replace `build_messages(...)` calls with `resolved.session.init_messages(...)`.
- Replace `candidate.update(...)` with `resolved.state.update(...)`.
- Replace `candidate.as_dict()` with `resolved.state.as_dict()`.
- Replace `candidate.save(...)` with `resolved.state.save(...)`.

When `resolved` is None, the existing code path executes unchanged.

**Step 4:** Verify the existing code path still works:
```bash
cd _agchain/legal-10/runspecs/3-STEP-RUN && python run_3s.py --help
```
Confirm `--profile` appears in help output and the command does not error.

**Step 5:** If a test EU is available, run with `--profile baseline` and diff artifacts against a run without `--profile`. If no test EU is available, verify at minimum that the help output is correct and the import path resolves.

**Test command:** `cd _agchain/legal-10/runspecs/3-STEP-RUN && python run_3s.py --help`
**Expected output:** Help text includes `--profile` argument.

**Commit:** `feat(agchain): wire profile selection into 3-step runner`

---

### Task 7: Run all tests and verify no regressions

**File(s):** All test files.

**Step 1:** Run all profile tests:
```bash
cd _agchain/legal-10 && python -m pytest tests/test_profile_types.py tests/test_profile_registry.py -v
```

**Step 2:** Run existing tests to verify no regressions:
```bash
cd _agchain/legal-10 && python -m pytest tests/ -v
```

**Step 3:** Verify JSON schema export produces a complete schema:
```bash
cd _agchain && python -c "
from profiles.types import Profile
import json
schema = Profile.model_json_schema()
with open('profiles/profile_schema.json', 'w') as f:
    json.dump(schema, f, indent=2)
print(f'Schema written: {len(json.dumps(schema))} bytes')
"
```

**Test command:** Both pytest commands above.
**Expected output:** All tests pass. Schema file written.

**Commit:** `chore(agchain): verify profile tests and export schema`

---

## Execution Handoff

When this plan is approved:

1. Read the plan fully before starting.
2. Follow the plan exactly. Do not improvise on locked decisions.
3. If a locked decision turns out to be wrong, stop and revise the plan.
4. Use the `verification-before-completion` skill before claiming any task is done.
5. The Inspect AI integration plan is a separate subsequent plan. Do not start it as part of this work.

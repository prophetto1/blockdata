# Runtime Config and Doc Consolidation Implementation Plan

**Goal:** Introduce a typed RuntimeConfig to the Legal-10 3-step runner that formalizes the currently implicit execution settings, consolidate the competing March 27 runtime/environment docs into a clear authority hierarchy, and prepare the run artifact surface for future InspectAI supporting logs — all without changing any existing runtime semantics.

**Architecture:** The owned runtime seam is the offline Legal-10 runner at `_agchain/legal-10/runspecs/3-STEP-RUN/`. The execution backend seam (`execution_backend.py`, `inspect_backend.py`, `execution_result.py`) and the profile system (`_agchain/profiles/`) already exist and are not modified. RuntimeConfig is a new Pydantic model that captures the _resolved_ execution settings from CLI flags and optional Profile, serializes to run artifacts, and validates invalid combinations. The six frozen runtime helpers (`payload_gate.py`, `input_assembler.py`, `staging.py`, `state.py`, `audit.py`, and the `execution_backend` module) are not modified.

**Tech Stack:** Python 3.10+, Pydantic v2 (already in `requirements.txt`), pytest, Markdown.

**Status:** Draft
**Author:** User + AI
**Date:** 2026-03-27

---

## Manifest

### Platform API

No platform API changes.

This plan is confined to the offline Legal-10 runner under `_agchain/legal-10/` and contract docs under `docs/plans/`. The platform-api service is not touched.

### Observability

No OpenTelemetry traces, metrics, or structured logs are introduced.

Justification: The owned runtime seam is the offline Legal-10 runner, which writes local file artifacts (`audit_log.jsonl`, `run.jsonl`, `run_manifest.json`, `summary.json`). Those are the observability surface for this domain. This plan extends the local artifact surface with a new `runtime_config.json` artifact. Supporting log pointer fields (`supporting_log_paths`) are structural fields inside `RuntimeConfig` — they are `null` for baseline runs and will carry InspectAI eval/transcript/trace paths when that integration matures. No OTel integration is in scope.

### Database Migrations

No database changes.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

No frontend changes.

### Developer Env Ownership

No new dependencies. Pydantic v2 is already in `_agchain/legal-10/requirements.txt`. No new `.env` variables.

---

## Seam Mismatch Statement

The default investigation paths in the plan skill assume `platform-api`, Supabase, and frontend as the primary seams. This plan's actual owned seam is the offline benchmark runner under `_agchain/legal-10/runspecs/3-STEP-RUN/`. The zero-case statements above for API, database, edge functions, and frontend are verified conclusions, not shortcuts — this work does not touch those surfaces.

---

## Pre-Implementation Contract

No major runtime, config, doc-authority, or artifact decision may be improvised during implementation. If any locked item below needs to change, the implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. RuntimeConfig is a Pydantic model in the runner's `runtime/` package, not in `_agchain/profiles/`. Profiles compose _into_ RuntimeConfig; RuntimeConfig does not depend on or extend Profile.
2. The six frozen runtime helpers (`payload_gate.py`, `input_assembler.py`, `staging.py`, `state.py`, `audit.py`, `execution_backend.py`) are not modified by this plan. They are already correct.
3. The existing `--execution-backend` and `--profile` CLI flags remain as-is. RuntimeConfig is resolved _from_ them internally. No new CLI flags are added.
4. `runtime_config.json` is a new run-level artifact written alongside `summary.json` and `run_manifest.json`. Its hash is included in the manifest.
5. The flat inventory doc (`2026-03-27-runtime-and-environment-contract-inventory.md`) becomes the primary authority. The profile contract doc becomes a secondary companion. The old profile implementation plan is marked superseded (already implemented).
6. Supporting log pointer fields live in `RuntimeConfig.supporting_log_paths: dict[str, str] | None` and are persisted in `runtime_config.json`. They are `None` for baseline direct runs. When a future InspectAI `eval()` pipeline integration produces eval logs, transcripts, or traces, those file paths will be recorded here. No additional manifest schema change is needed — the pointer fields are inside the config artifact.

### Locked Acceptance Contract

The implementation is complete only when all of the following are true:

1. `RuntimeConfig.baseline()` returns a config where `backend="direct"`, `session_strategy="replay_minimal"`, `state_provider="type_0"`, `tool_mode="none"`, `approval_mode="none"`, `sandbox_mode="none"`, `remote_mcp_enabled=False`, `network_enabled=False`, `supporting_logs_enabled=False`, `supporting_log_paths=None`.
2. `RuntimeConfig(backend="inspect", remote_mcp_enabled=True)` is rejected by validation.
3. `RuntimeConfig(network_enabled=True)` is rejected by validation (current phase).
4. `RuntimeConfig(tool_mode="standard")`, `RuntimeConfig(approval_mode="policy")`, and `RuntimeConfig(sandbox_mode="docker")` are all rejected by validation (current phase).
5. `RuntimeConfig.from_profile(BASELINE_PROFILE)` correctly translates `no_tools` → `none` and passes validation.
6. `run_3s.py` resolves a RuntimeConfig after CLI parsing and records it in `runtime_config.json` in the run directory.
7. `run_manifest.json` includes the `runtime_config.json` hash in its `file_hashes`.
8. `run_manifest.json` derives `session_strategy` and `reproducibility_key` from the resolved RuntimeConfig, not from hard-coded literals.
9. All existing Legal-10 tests still pass with zero behavioral changes.
10. The flat inventory doc contains 3 new items (Eval Runtime Config, Supporting Execution Logs, Runtime Limits), augmented invariants on 3 existing items (Approval Policy, Tool/MCP Execution, Sandbox), and an InspectAI Integration Boundary section.
11. The profile contract doc header says "Secondary companion — see runtime-and-environment-contract-inventory.md for primary authority."
12. The profile implementation plan says "Superseded — implemented" in its Status field.

---

## Frozen Seam Contract

### Runtime Helpers: Do Not Touch

The following files own AGChain benchmark semantics and are frozen for this plan. Do not modify them:

| File | Frozen Role |
|------|------------|
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/payload_gate.py` | Payload admission |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/input_assembler.py` | Structured message window assembly |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/staging.py` | Per-step isolation |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/state.py` | Candidate state sanitization |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/audit.py` | Audit record emission |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_backend.py` | Backend protocol + resolver |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/inspect_backend.py` | InspectAI backend |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_result.py` | Execution result dataclass |
| `_agchain/legal-10/runspecs/3-STEP-RUN/adapters/model_adapter.py` | Direct API adapters |

### Profile Package: Do Not Touch

The following files in `_agchain/profiles/` are frozen for this plan:

| File | Frozen Role |
|------|------------|
| `_agchain/profiles/types.py` | Profile Pydantic model |
| `_agchain/profiles/registry.py` | Strategy registry + resolver |
| `_agchain/profiles/baseline.py` | Baseline profile definition |
| `_agchain/profiles/strategies/session.py` | Session strategy Protocol + implementations |
| `_agchain/profiles/strategies/state_provider.py` | State provider Protocol + Type0Provider |

RuntimeConfig reads from Profile when one is provided but does not modify Profile's contract.

---

## Locked File Inventory

### New files: 2

| File | Purpose |
|------|---------|
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/runtime_config.py` | Typed RuntimeConfig Pydantic model with baseline factory, validators, and JSON serialization |
| `_agchain/legal-10/tests/test_runtime_config.py` | Tests for config validation, baseline defaults, serialization, profile construction, and invalid combo rejection |

### Modified files: 6

| File | What changes |
|------|-------------|
| `docs/plans/2026-03-27-runtime-and-environment-contract-inventory.md` | Add primary-authority header note, 3 new inventory items, augment invariants on 3 existing items, add InspectAI Integration Boundary section |
| `docs/plans/2026-03-27-environment-and-runtime-profile-contract.md` | Add secondary-companion header note |
| `docs/plans/2026-03-27-environment-and-runtime-profile-implementation-plan.md` | Change Status to "Superseded — implemented by profile-types-and-registry plan" |
| `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py` | Resolve RuntimeConfig after CLI parsing, write `runtime_config.json` to run dir, derive manifest provenance fields from RuntimeConfig, pass to `run_single_eu()` |
| `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/__init__.py` | Export `RuntimeConfig` |
| `_agchain/legal-10/tests/test_execution_backend.py` | Extend integration test to verify `runtime_config.json` written and included in manifest |

### Locked Inventory Counts

- New files: `2`
- Modified docs: `3`
- Modified code: `2` (`run_3s.py`, `runtime/__init__.py`)
- Modified tests: `1` (`test_execution_backend.py`)
- New test modules: `1` (`test_runtime_config.py`)
- Frozen files: `14` (runtime helpers + profile package — must not be touched)

---

## Explicit Risks Accepted In This Plan

1. RuntimeConfig captures the _structural surface_ for approval, sandbox, tool, and MCP modes, but only `none`/baseline values are valid in this phase. The enforcement validators will need relaxing when those features are implemented in future plans.
2. Supporting log pointer fields are empty/null for all current runs because the InspectAI backend only uses `Model.generate()`, not the full `eval()` pipeline that produces eval logs and transcripts. Those fields exist to prevent a future plan from needing to change the artifact schema.
3. The flat inventory doc additions describe planned items with "Planned" or "Defined" status. They are not claims that the items are implemented.
4. The profile implementation plan is marked superseded even though its Status field said "Draft" — the profiles package was implemented from a later refined plan (`profile-types-and-registry-implementation-plan.md`).
5. Manifest `session_strategy` and `reproducibility_key` change casing from `Replay_Minimal` (mixed case, current hard-coded value) to `replay_minimal` (lowercase, derived from RuntimeConfig). Any downstream consumer parsing these fields from existing manifests will see the format change. No known consumers exist outside the test suite, and the integration test is updated to match.

---

## Tasks

### Task 1: Add missing items and boundary section to flat inventory doc

**File:** `docs/plans/2026-03-27-runtime-and-environment-contract-inventory.md`

**Step 1:** Add a primary-authority note immediately after the Status/Date header:

```markdown
> **Authority:** This is the primary runtime/environment contract. See `2026-03-27-environment-and-runtime-profile-contract.md` for the secondary schema/modeling companion. See `2026-03-27-inspect-ai-substrate-gap-analysis.md` for the InspectAI comparison analysis.
```

**Step 2:** Add 3 genuinely new rows to the Flat Contract Inventory table, after the existing "Per-EU Isolation" row:

| Item | Definition | Applies When | Inputs | Outputs / Effects | Invariants | Status | Ownership |
|------|-----------|-------------|--------|-------------------|------------|--------|-----------|
| Eval Runtime Config | Typed configuration object capturing resolved execution settings for a benchmark run: backend, session strategy, state provider, tool mode, approval mode, sandbox mode, limits, supporting log policy | Runtime | CLI flags, optional Profile, defaults | Resolved config recorded in `runtime_config.json`; used by runner to select behavior paths | `baseline()` must reproduce current 3-step MVP behavior exactly; invalid combinations rejected at resolution time | Defined | AGChain-owned |
| Supporting Execution Logs | Execution log artifacts produced by InspectAI (eval log, transcript, trace) that are distinct from canonical AGChain audit proof | Runtime (InspectAI backend) | InspectAI execution outputs | Optional log file references recorded in `runtime_config.json` via `supporting_log_paths` | Never required for baseline direct runs; canonical `audit_log.jsonl` remains admissibility proof; supporting logs are additive evidence only | Planned | InspectAI-produced, AGChain-referenced |
| Runtime Limits | Execution resource limits applied to benchmark runs | Runtime | Limit configuration from RuntimeConfig or Profile constraints | Execution bounded by token/message/time/cost/retry limits | Limits must be benchmark-valid; fail-on-error behavior explicit; retry behavior must not change benchmark semantics | Defined | AGChain-owned policy, InspectAI-backed enforcement |

**Step 2b:** Augment 3 existing rows that already cover the concept but lack the detail recommended by the substrate gap analysis. Do not duplicate — edit in place:

- **Approval Policy** (existing row at ~L125): Add to Invariants: "Governs tool calls only; must not replace or override payload admission; default is no-approval for no-tools baseline."
- **Tool-Assisted Execution / MCP-Enabled Execution** (existing rows at ~L126-127): Add to Invariants: "Standard tools require explicit allowlist; MCP tools require explicit server config; remote MCP is default-off unless explicitly permitted by contract revision."
- **Sandbox Execution / Sandbox Lifecycle** (existing rows at ~L123, L128): Add to Invariants: "Legal-10 baseline uses no sandbox; binding is per-run when enabled; network access default-off; cleanup mandatory."

**Step 3:** Add an InspectAI Integration Boundary section after the Locked Ownership Rules section:

```markdown
## InspectAI Integration Boundary

### AGChain Owns

- Payload admission (`inject_payloads` / `payload_gate.py`)
- Structured message window assembly (`input_assembler.py`)
- Candidate state sanitization and carry-forward (`state.py`)
- Candidate/judge isolation rules (runner enforces what each role sees)
- Canonical audit proof (`audit_log.jsonl`, staged file hashes, message hashes)
- Bundle sealing, manifest, and signature verification
- Eval Runtime Config resolution and validation
- Runtime limit policy
- Profile identity and version tracking

### Wrapped From InspectAI

- Model execution via `Model.generate()` (`execution_backend.py` / `inspect_backend.py`)
- Model roles (evaluated vs judge) — InspectAI provides the mechanism, AGChain defines the policy
- Token accounting and execution timing from `ModelOutput`
- Future: tool execution pipeline, approval policy enforcement, sandbox lifecycle, eval logging

### Out of Scope (Current Phase)

- Remote MCP transport (default-off, requires explicit future contract revision)
- Networked sandbox execution (default-off)
- Full InspectAI `eval()` pipeline integration (only `Model.generate()` is used)
- Solver/task/sample framework (AGChain's runner owns the execution lifecycle)
```

**Test command:** `grep -c "Eval Runtime Config\|Approval Policy\|Sandbox Binding\|Supporting Execution Logs\|Tool Selection and MCP Selection\|Runtime Limits\|InspectAI Integration Boundary\|primary runtime/environment contract" docs/plans/2026-03-27-runtime-and-environment-contract-inventory.md`

**Expected output:** At least 8 matches.

**Commit:** `docs: add 3 new inventory items, augment 3 existing, add InspectAI boundary to flat contract`

---

### Task 2: Mark secondary and superseded docs

**Files:**
- `docs/plans/2026-03-27-environment-and-runtime-profile-contract.md`
- `docs/plans/2026-03-27-environment-and-runtime-profile-implementation-plan.md`

**Step 1:** In the profile contract doc, add a note immediately after the `**Status:** Draft` line:

```markdown
> **Authority:** Secondary schema/modeling companion. The primary runtime/environment contract is `2026-03-27-runtime-and-environment-contract-inventory.md`. This document provides the configuration shape and selectable modes; it does not override the flat inventory's ownership or invariant declarations.
```

**Step 2:** In the profile implementation plan, change the Status line from `Draft` to:

```markdown
**Status:** Superseded — implemented by `2026-03-27-profile-types-and-registry-implementation-plan.md`. Code lives in `_agchain/profiles/`.
```

**Test command:** `grep -c "Secondary schema/modeling companion\|Superseded" docs/plans/2026-03-27-environment-and-runtime-profile-contract.md docs/plans/2026-03-27-environment-and-runtime-profile-implementation-plan.md`

**Expected output:** 1 match in each file.

**Commit:** `docs: mark profile contract as secondary, profile impl plan as superseded`

---

### Task 3: Write failing tests for RuntimeConfig

**File:** `_agchain/legal-10/tests/test_runtime_config.py`

**Step 1:** Write tests covering:

1. **`test_baseline_defaults`** — `RuntimeConfig.baseline()` returns expected default values for all fields including `supporting_log_paths=None`.
2. **`test_baseline_serialization_roundtrip`** — `baseline().model_dump_json()` → `RuntimeConfig.model_validate_json()` produces identical config.
3. **`test_reject_inspect_with_remote_mcp`** — `RuntimeConfig(backend="inspect", remote_mcp_enabled=True, ...)` raises `ValidationError`.
4. **`test_reject_network_enabled`** — `RuntimeConfig(network_enabled=True, ...)` raises `ValidationError`.
5. **`test_reject_remote_mcp_enabled`** — `RuntimeConfig(remote_mcp_enabled=True, ...)` raises `ValidationError`.
6. **`test_reject_tool_mode_standard`** — `RuntimeConfig(tool_mode="standard")` raises `ValidationError` (current phase).
7. **`test_reject_approval_mode_policy`** — `RuntimeConfig(approval_mode="policy")` raises `ValidationError` (current phase).
8. **`test_reject_sandbox_mode_docker`** — `RuntimeConfig(sandbox_mode="docker")` raises `ValidationError` (current phase).
9. **`test_from_profile`** — `RuntimeConfig.from_profile(BASELINE_PROFILE)` translates `no_tools` → `none` and returns correct values.
10. **`test_custom_limits`** — RuntimeConfig with custom `RuntimeLimits` serializes correctly.
11. **`test_supporting_logs_default_off`** — Baseline config has `supporting_logs_enabled=False` and `supporting_log_paths=None`.

```python
from __future__ import annotations

import sys
from pathlib import Path

import pytest

RUNSPEC_ROOT = Path(__file__).resolve().parents[1] / "runspecs" / "3-STEP-RUN"
if str(RUNSPEC_ROOT) not in sys.path:
    sys.path.insert(0, str(RUNSPEC_ROOT))

from pydantic import ValidationError

from runtime.runtime_config import RuntimeConfig, RuntimeLimits


def test_baseline_defaults() -> None:
    cfg = RuntimeConfig.baseline()
    assert cfg.backend == "direct"
    assert cfg.session_strategy == "replay_minimal"
    assert cfg.state_provider == "type_0"
    assert cfg.tool_mode == "none"
    assert cfg.approval_mode == "none"
    assert cfg.sandbox_mode == "none"
    assert cfg.remote_mcp_enabled is False
    assert cfg.network_enabled is False
    assert cfg.supporting_logs_enabled is False
    assert cfg.supporting_log_paths is None
    assert cfg.profile_id is None


def test_baseline_serialization_roundtrip() -> None:
    cfg = RuntimeConfig.baseline()
    json_str = cfg.model_dump_json()
    restored = RuntimeConfig.model_validate_json(json_str)
    assert restored == cfg


def test_reject_inspect_with_remote_mcp() -> None:
    with pytest.raises(ValidationError):
        RuntimeConfig(
            backend="inspect",
            remote_mcp_enabled=True,
            session_strategy="replay_minimal",
            state_provider="type_0",
            tool_mode="none",
            approval_mode="none",
            sandbox_mode="none",
        )


def test_reject_network_enabled() -> None:
    with pytest.raises(ValidationError):
        RuntimeConfig(
            backend="direct",
            network_enabled=True,
            session_strategy="replay_minimal",
            state_provider="type_0",
            tool_mode="none",
            approval_mode="none",
            sandbox_mode="none",
        )


def test_reject_remote_mcp_enabled() -> None:
    with pytest.raises(ValidationError):
        RuntimeConfig(
            backend="direct",
            remote_mcp_enabled=True,
            session_strategy="replay_minimal",
            state_provider="type_0",
            tool_mode="none",
            approval_mode="none",
            sandbox_mode="none",
        )


def test_reject_tool_mode_standard() -> None:
    with pytest.raises(ValidationError):
        RuntimeConfig(tool_mode="standard")


def test_reject_approval_mode_policy() -> None:
    with pytest.raises(ValidationError):
        RuntimeConfig(approval_mode="policy")


def test_reject_sandbox_mode_docker() -> None:
    with pytest.raises(ValidationError):
        RuntimeConfig(sandbox_mode="docker")


def test_from_profile() -> None:
    _agchain_root = Path(__file__).resolve().parents[2]
    if str(_agchain_root) not in sys.path:
        sys.path.insert(0, str(_agchain_root))

    from profiles.baseline import BASELINE_PROFILE

    cfg = RuntimeConfig.from_profile(BASELINE_PROFILE)
    assert cfg.session_strategy == "replay_minimal"
    assert cfg.state_provider == "type_0"
    assert cfg.tool_mode == "none"
    assert cfg.profile_id == "baseline"
    assert cfg.backend == "direct"
    # Verify limits propagation from profile constraints
    assert cfg.limits.max_retries_per_step == 3
    assert cfg.limits.time_limit_seconds == 300
    assert cfg.limits.max_tokens_per_step is None
    assert cfg.limits.max_cost_per_run is None


def test_custom_limits() -> None:
    limits = RuntimeLimits(
        max_tokens_per_step=2048,
        max_cost_per_run=1.0,
        time_limit_seconds=600,
    )
    cfg = RuntimeConfig.baseline()
    cfg_with_limits = cfg.model_copy(update={"limits": limits})
    data = cfg_with_limits.model_dump()
    assert data["limits"]["max_tokens_per_step"] == 2048
    assert data["limits"]["max_cost_per_run"] == 1.0
    assert data["limits"]["time_limit_seconds"] == 600


def test_supporting_logs_default_off() -> None:
    cfg = RuntimeConfig.baseline()
    assert cfg.supporting_logs_enabled is False
    assert cfg.supporting_log_paths is None
    data = cfg.model_dump()
    assert data["supporting_logs_enabled"] is False
    assert data["supporting_log_paths"] is None
```

**Step 2:** Run the tests to confirm they fail (module doesn't exist yet).

**Test command:** `cd _agchain/legal-10 && python -m pytest tests/test_runtime_config.py -v 2>&1 | head -20`

**Expected output:** `ModuleNotFoundError: No module named 'runtime.runtime_config'`

**Commit:** `test: add failing tests for RuntimeConfig`

---

### Task 4: Implement RuntimeConfig

**File:** `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/runtime_config.py`

**Step 1:** Create the module:

```python
"""RuntimeConfig: typed execution configuration for benchmark runs.

Captures the resolved execution settings from CLI flags and optional Profile.
Serializes to JSON for inclusion in run artifacts. Validates invalid combinations.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, model_validator


class RuntimeLimits(BaseModel):
    max_tokens_per_step: int | None = None
    max_messages_per_step: int | None = None
    time_limit_seconds: int | None = None
    working_limit_seconds: int | None = None
    max_cost_per_run: float | None = None
    max_retries_per_step: int = 3


class RuntimeConfig(BaseModel):
    backend: Literal["direct", "inspect"] = "direct"
    session_strategy: Literal["replay_minimal", "replay_full"] = "replay_minimal"
    state_provider: Literal["type_0", "type_i", "type_ii", "type_iii"] = "type_0"
    tool_mode: Literal["none", "standard", "mcp"] = "none"
    approval_mode: Literal["none", "policy"] = "none"
    sandbox_mode: Literal["none", "local", "docker"] = "none"
    remote_mcp_enabled: bool = False
    network_enabled: bool = False
    supporting_logs_enabled: bool = False
    supporting_log_paths: dict[str, str] | None = None
    limits: RuntimeLimits = RuntimeLimits()
    profile_id: str | None = None

    @model_validator(mode="after")
    def _validate_current_phase(self) -> "RuntimeConfig":
        if self.remote_mcp_enabled:
            raise ValueError(
                "remote_mcp_enabled=True is not permitted in the current phase"
            )
        if self.network_enabled:
            raise ValueError(
                "network_enabled=True is not permitted in the current phase"
            )
        if self.tool_mode != "none":
            raise ValueError(
                f"tool_mode='{self.tool_mode}' is not permitted in the current phase"
            )
        if self.approval_mode != "none":
            raise ValueError(
                f"approval_mode='{self.approval_mode}' is not permitted in the current phase"
            )
        if self.sandbox_mode != "none":
            raise ValueError(
                f"sandbox_mode='{self.sandbox_mode}' is not permitted in the current phase"
            )
        return self

    @classmethod
    def baseline(cls) -> "RuntimeConfig":
        """Return a config that exactly reproduces the current 3-step MVP runtime."""
        return cls()

    # Profile tool_strategy.strategy_id → RuntimeConfig tool_mode translation.
    # Profile uses "no_tools"; RuntimeConfig uses "none". Others pass through.
    _TOOL_MODE_MAP: dict[str, str] = {
        "no_tools": "none",
        "standard": "standard",
        "mcp": "mcp",
    }

    @classmethod
    def from_profile(cls, profile: Any, *, backend: str = "direct") -> "RuntimeConfig":
        """Build a RuntimeConfig from an existing Profile object."""
        session_id = profile.session_strategy.strategy_id
        state_id = profile.state_provider.provider_id
        raw_tool_id = profile.tool_strategy.strategy_id
        tool_mode = cls._TOOL_MODE_MAP.get(raw_tool_id)
        if tool_mode is None:
            raise ValueError(
                f"Unknown profile tool_strategy '{raw_tool_id}'. "
                f"Known mappings: {list(cls._TOOL_MODE_MAP)}"
            )

        limits = RuntimeLimits(
            max_tokens_per_step=profile.constraints.max_tokens_per_step,
            max_cost_per_run=profile.constraints.max_cost_per_run,
            max_retries_per_step=profile.constraints.max_retries_per_step,
            time_limit_seconds=profile.constraints.timeout_per_step_seconds,
        )

        return cls(
            backend=backend,
            session_strategy=session_id,
            state_provider=state_id,
            tool_mode=tool_mode,
            limits=limits,
            profile_id=profile.id,
        )
```

**Step 2:** Run the tests.

**Test command:** `cd _agchain/legal-10 && python -m pytest tests/test_runtime_config.py -v`

**Expected output:** All 11 tests pass.

**Step 3:** Update `runtime/__init__.py` to export `RuntimeConfig`:

Add `from runtime.runtime_config import RuntimeConfig, RuntimeLimits` to the imports and add `RuntimeConfig`, `RuntimeLimits` to the module's public surface.

**Commit:** `feat: add typed RuntimeConfig with baseline factory and validators`

---

### Task 5: Wire RuntimeConfig into run_3s.py

**File:** `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`

**Step 1:** Add import at the top (with the other runtime imports):

```python
from runtime.runtime_config import RuntimeConfig
```

**Step 2:** In `main()`, after the profile resolution block and before `judge_provider = ...` (around line 501), resolve the RuntimeConfig:

```python
    # Resolve runtime config
    if _profile_obj is not None:
        runtime_config = RuntimeConfig.from_profile(
            _profile_obj, backend=args.execution_backend
        )
    else:
        runtime_config = RuntimeConfig.baseline()
        if args.execution_backend != "direct":
            runtime_config = runtime_config.model_copy(
                update={"backend": args.execution_backend}
            )
```

**Step 3:** Pass `runtime_config` to `run_single_eu()`. Add `runtime_config: RuntimeConfig | None = None` parameter to the function signature.

**Step 4:** Inside `run_single_eu()`, after writing `summary.json` and before writing `run_manifest.json`, write the runtime config artifact:

```python
    # Write runtime config
    if runtime_config is not None:
        rc_path = runs_dir / run_id / "runtime_config.json"
        rc_path.write_text(
            runtime_config.model_dump_json(indent=2) + "\n", encoding="utf-8"
        )
```

**Step 5:** The existing manifest hash loop already hashes all files in the run directory except `run_manifest.json` itself. Since `runtime_config.json` is written before the manifest loop, it will be automatically included in `file_hashes`.

**Step 6:** Update the manifest provenance fields to derive from RuntimeConfig instead of hard-coding them. Replace the hard-coded `"session_strategy": "Replay_Minimal"` and the `reproducibility_key` string in the manifest dict:

```python
    manifest = {
        ...
        "session_strategy": runtime_config.session_strategy if runtime_config else "replay_minimal",
        ...
        "reproducibility_key": (
            f"{resolved_eval_model_name}|{resolved_judge_model_name}"
            f"|temp=0.0|{runtime_config.session_strategy if runtime_config else 'replay_minimal'}"
        ),
        ...
    }
```

This ensures that if a non-baseline profile sets `replay_full`, the manifest and `runtime_config.json` agree rather than contradict each other.

**Step 7:** Run all existing tests to verify no regressions.

**Test command:** `cd _agchain/legal-10 && python -m pytest tests/ -v`

**Expected output:** All existing tests pass. The integration test in `test_execution_backend.py` still passes because `runtime_config` defaults to `None` in the function signature.

**Commit:** `feat: wire RuntimeConfig into run_3s.py, write runtime_config.json artifact`

---

### Task 6: Extend integration test to verify RuntimeConfig in artifacts

**File:** `_agchain/legal-10/tests/test_execution_backend.py`

**Step 1:** In the existing `test_run_single_eu_emits_execution_metadata_and_manifest` test, add these imports at the top of the file:

```python
from runtime.runtime_config import RuntimeConfig
```

**Step 2:** In the same test, pass a RuntimeConfig to `run_single_eu`:

```python
        runtime_config=RuntimeConfig(backend="inspect"),
```

**Step 3:** After the existing manifest assertions, add:

```python
    # Verify runtime_config.json written and included in manifest
    rc_path = runs_dir / "run_test" / "runtime_config.json"
    assert rc_path.exists(), "runtime_config.json should be written"
    rc_data = json.loads(rc_path.read_text(encoding="utf-8"))
    assert rc_data["backend"] == "inspect"
    assert rc_data["session_strategy"] == "replay_minimal"
    assert rc_data["supporting_logs_enabled"] is False
    assert rc_data["supporting_log_paths"] is None
    assert "runtime_config.json" in manifest["file_hashes"]

    # Verify manifest provenance derived from RuntimeConfig, not hard-coded
    assert manifest["session_strategy"] == "replay_minimal"
    assert "replay_minimal" in manifest["reproducibility_key"]
```

**Step 4:** Run all tests.

**Test command:** `cd _agchain/legal-10 && python -m pytest tests/ -v`

**Expected output:** All tests pass, including the extended integration test verifying `runtime_config.json`.

**Step 5:** Verify no frozen files were modified.

**Verification command:** `cd _agchain/legal-10 && git diff --name-only -- runspecs/3-STEP-RUN/runtime/payload_gate.py runspecs/3-STEP-RUN/runtime/input_assembler.py runspecs/3-STEP-RUN/runtime/staging.py runspecs/3-STEP-RUN/runtime/state.py runspecs/3-STEP-RUN/runtime/audit.py runspecs/3-STEP-RUN/runtime/execution_backend.py runspecs/3-STEP-RUN/runtime/inspect_backend.py runspecs/3-STEP-RUN/runtime/execution_result.py runspecs/3-STEP-RUN/adapters/model_adapter.py ../../profiles/types.py ../../profiles/registry.py ../../profiles/baseline.py ../../profiles/strategies/session.py ../../profiles/strategies/state_provider.py`

**Expected output:** Empty (no output = no frozen files modified).

**Commit:** `test: verify RuntimeConfig artifact in integration test`

---

## Completion Criteria

The work is complete only when all of the following are true:

1. `RuntimeConfig.baseline()` returns the expected defaults including `supporting_log_paths=None`.
2. Invalid combinations (`remote_mcp_enabled=True`, `network_enabled=True`, `tool_mode="standard"`, `approval_mode="policy"`, `sandbox_mode="docker"`) are all rejected by validation.
3. `RuntimeConfig.from_profile(BASELINE_PROFILE)` correctly translates `no_tools` → `none` and derives all fields from the profile.
4. `run_3s.py` resolves a RuntimeConfig and writes `runtime_config.json` to the run directory.
5. `run_manifest.json` includes `runtime_config.json` in its `file_hashes`.
6. `run_manifest.json` derives `session_strategy` and `reproducibility_key` from RuntimeConfig, not hard-coded literals.
7. The flat inventory doc contains 3 new items, augmented invariants on 3 existing items, and an InspectAI Integration Boundary section.
8. The profile contract doc is marked secondary; the profile implementation plan is marked superseded.
9. All 14 frozen files are unmodified.
10. All tests pass: `cd _agchain/legal-10 && python -m pytest tests/ -v`.

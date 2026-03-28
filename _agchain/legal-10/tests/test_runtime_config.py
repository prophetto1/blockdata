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


@pytest.mark.parametrize("tool_strategy_id", ["standard", "mcp"])
def test_from_profile_rejects_future_phase_tool_modes_early(tool_strategy_id: str) -> None:
    _agchain_root = Path(__file__).resolve().parents[2]
    if str(_agchain_root) not in sys.path:
        sys.path.insert(0, str(_agchain_root))

    from profiles.baseline import BASELINE_PROFILE
    from profiles.types import ToolStrategyConfig

    future_profile = BASELINE_PROFILE.model_copy(
        update={"tool_strategy": ToolStrategyConfig(strategy_id=tool_strategy_id)}
    )

    with pytest.raises(
        ValueError,
        match=(
            f"Profile tool_strategy '{tool_strategy_id}' is not permitted in the current phase"
        ),
    ):
        RuntimeConfig.from_profile(future_profile)


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

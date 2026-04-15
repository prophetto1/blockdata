"""RuntimeConfig: typed execution configuration for benchmark runs.

Captures the resolved execution settings from CLI flags and optional Profile.
Serializes to JSON for inclusion in run artifacts. Validates invalid combinations.
"""

from __future__ import annotations

from typing import Any, ClassVar, Literal

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

    # Profile tool_strategy.strategy_id -> RuntimeConfig tool_mode translation.
    # Profile uses "no_tools"; RuntimeConfig uses "none". Others pass through.
    _TOOL_MODE_MAP: ClassVar[dict[str, str]] = {
        "no_tools": "none",
        "standard": "standard",
        "mcp": "mcp",
    }
    _CURRENT_PHASE_PROFILE_TOOL_IDS: ClassVar[frozenset[str]] = frozenset({"no_tools"})

    @classmethod
    def from_profile(cls, profile: Any, *, backend: str = "direct") -> "RuntimeConfig":
        """Build a RuntimeConfig from an existing Profile object."""
        session_id = profile.session_strategy.strategy_id
        state_id = profile.state_provider.provider_id
        raw_tool_id = profile.tool_strategy.strategy_id
        if raw_tool_id not in cls._TOOL_MODE_MAP:
            raise ValueError(
                f"Unknown profile tool_strategy '{raw_tool_id}'. "
                f"Known mappings: {list(cls._TOOL_MODE_MAP)}"
            )
        if raw_tool_id not in cls._CURRENT_PHASE_PROFILE_TOOL_IDS:
            raise ValueError(
                f"Profile tool_strategy '{raw_tool_id}' is not permitted in the current phase"
            )
        tool_mode = cls._TOOL_MODE_MAP[raw_tool_id]

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

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

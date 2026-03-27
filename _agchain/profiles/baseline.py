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

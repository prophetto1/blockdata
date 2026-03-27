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

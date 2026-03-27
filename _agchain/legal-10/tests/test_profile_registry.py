"""Tests for profile registry and resolution."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

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

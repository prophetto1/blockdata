"""Tests for profile Pydantic type models."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

# Add _agchain to path so profiles package is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

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

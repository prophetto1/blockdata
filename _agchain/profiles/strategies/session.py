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

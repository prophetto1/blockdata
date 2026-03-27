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

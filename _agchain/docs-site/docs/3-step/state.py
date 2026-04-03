"""CandidateState: sanitized carry-forward state between steps.

Ground truth, scores, and judge outputs are NEVER included in state.
"""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any

_FORBIDDEN_KEYS = frozenset({
    "ground_truth", "score", "scores", "judge", "judge_result",
    "judge_output", "correct", "errors", "details",
})

_FORBIDDEN_PREFIXES = ("gt_", "rubric", "scoring_", "judge_")


class CandidateState:
    """Accumulates sanitized model outputs across steps."""

    def __init__(self) -> None:
        self._data: dict[str, Any] = {}

    def update(self, step_id: str, output: dict[str, Any]) -> None:
        """Add sanitized output for a step."""
        self._data[step_id] = self._sanitize(output)

    def as_dict(self) -> dict[str, Any]:
        return deepcopy(self._data)

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(self._data, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    @classmethod
    def load(cls, path: Path) -> "CandidateState":
        state = cls()
        if path.exists():
            state._data = json.loads(path.read_text(encoding="utf-8"))
        return state

    @staticmethod
    def _is_forbidden(key: str) -> bool:
        """Check if a key should be stripped (exact match or prefix match)."""
        if key in _FORBIDDEN_KEYS:
            return True
        return key.startswith(_FORBIDDEN_PREFIXES)

    @staticmethod
    def _sanitize(data: Any) -> Any:
        """Strip forbidden keys recursively (exact match + prefix match)."""
        if isinstance(data, dict):
            return {
                k: CandidateState._sanitize(v)
                for k, v in data.items()
                if not CandidateState._is_forbidden(k)
            }
        if isinstance(data, list):
            return [CandidateState._sanitize(item) for item in data]
        return data

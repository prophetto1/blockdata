from __future__ import annotations

import dataclasses
from typing import Any

from blockdata.core.models.flows.state import State


class Output:
    def final_state(self) -> State | None:
        return None

    def to_dict(self) -> dict[str, Any]:
        if dataclasses.is_dataclass(self):
            return dataclasses.asdict(self)

        values = getattr(self, "__dict__", None)
        if isinstance(values, dict):
            return dict(values)

        return {}

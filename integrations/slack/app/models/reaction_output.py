from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class ReactionOutput(io):
    name: str | None = None
    count: int | None = None
    users: list[String] | None = None
    url: str | None = None

    def of(self, reaction: com) -> ReactionOutput:
        raise NotImplementedError  # TODO: translate from Java

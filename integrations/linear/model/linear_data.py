from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class LinearData:
    nodes: LinearNode | None = None

    @dataclass(slots=True)
    class LinearNode:
        id: str | None = None
        name: str | None = None


@dataclass(slots=True, kw_only=True)
class LinearNode:
    id: str | None = None
    name: str | None = None

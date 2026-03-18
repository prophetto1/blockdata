from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-linear\src\main\java\io\kestra\plugin\linear\model\LinearData.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class LinearData:
    nodes: list[LinearNode] | None = None

    @dataclass(slots=True)
    class LinearNode:
        id: str | None = None
        name: str | None = None

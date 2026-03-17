from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\validations\ManualPath.java
# WARNING: Unresolved types: Deque, Iterator, Node

from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(slots=True, kw_only=True)
class ManualPath:
    nodes: Deque[Node] | None = None

    def iterator(self) -> Iterator[Node]:
        raise NotImplementedError  # TODO: translate from Java

    def to_string(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

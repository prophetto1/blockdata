from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\validations\ManualPropertyNode.java
# WARNING: Unresolved types: Class, ElementKind, Node, PropertyNode, T

from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(slots=True, kw_only=True)
class ManualPropertyNode:
    container_class: Class[Any] | None = None
    name: str | None = None
    index: int | None = None
    key: Any | None = None
    kind: ElementKind | None = None
    in_iterable: bool | None = None

    def get_type_argument_index(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def as(self, node_type: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

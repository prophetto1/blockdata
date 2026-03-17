from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\hierarchies\Graph.java
# WARNING: Unresolved types: MutableValueGraph

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Graph:
    graph: MutableValueGraph[T, V] | None = None

    def add_node(self, node: T) -> Graph[T, V]:
        raise NotImplementedError  # TODO: translate from Java

    def add_edge(self, previous: T, next: T, value: V) -> Graph[T, V]:
        raise NotImplementedError  # TODO: translate from Java

    def remove_edge(self, previous: T, next: T) -> Graph[T, V]:
        raise NotImplementedError  # TODO: translate from Java

    def nodes(self) -> set[T]:
        raise NotImplementedError  # TODO: translate from Java

    def successors(self, node: T) -> set[T]:
        raise NotImplementedError  # TODO: translate from Java

    def predecessors(self, node: T) -> set[T]:
        raise NotImplementedError  # TODO: translate from Java

    def edges(self) -> set[Edge[T, V]]:
        raise NotImplementedError  # TODO: translate from Java

    def remove_node(self, node: T) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Edge:
        source: T | None = None
        target: T | None = None
        value: V | None = None

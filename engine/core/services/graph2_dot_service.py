from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\Graph2DotService.java
# WARNING: Unresolved types: URISyntaxException

from dataclasses import dataclass
from typing import Any

from engine.core.models.hierarchies.abstract_graph import AbstractGraph
from engine.core.models.hierarchies.graph import Graph
from engine.core.models.hierarchies.graph_cluster import GraphCluster
from engine.core.models.hierarchies.relation import Relation


@dataclass(slots=True, kw_only=True)
class Graph2DotService:

    @staticmethod
    def dot(graph: Graph[AbstractGraph, Relation]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def subgraph(sub_graph: GraphCluster, level: int) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def node_and_edges(graph: Graph[AbstractGraph, Relation], level: int, uid: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def indent(level: int) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def node(node: AbstractGraph) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def label(node: AbstractGraph) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def node_name(node: AbstractGraph) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def name(node: AbstractGraph) -> str:
        raise NotImplementedError  # TODO: translate from Java

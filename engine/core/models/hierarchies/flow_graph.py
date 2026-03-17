from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\hierarchies\FlowGraph.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.hierarchies.abstract_graph import AbstractGraph
from engine.core.models.hierarchies.graph_cluster import GraphCluster
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.hierarchies.relation import Relation


@dataclass(frozen=True, slots=True, kw_only=True)
class FlowGraph:
    nodes: list[AbstractGraph] | None = None
    edges: list[Edge] | None = None
    clusters: list[Cluster] | None = None
    flowables: list[str] | None = None

    @staticmethod
    def of(graph: GraphCluster) -> FlowGraph:
        raise NotImplementedError  # TODO: translate from Java

    def for_execution(self) -> FlowGraph:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Edge:
        source: str | None = None
        target: str | None = None
        relation: Relation | None = None

    @dataclass(slots=True)
    class Cluster:
        cluster: AbstractGraph | None = None
        nodes: list[str] | None = None
        parents: list[str] | None = None
        start: str | None = None
        end: str | None = None

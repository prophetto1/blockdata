from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\topologies\FlowTopologyGraph.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.topologies.flow_node import FlowNode
from engine.core.models.topologies.flow_relation import FlowRelation
from engine.core.models.hierarchies.graph import Graph


@dataclass(frozen=True, slots=True, kw_only=True)
class FlowTopologyGraph:
    nodes: set[FlowNode] | None = None
    edges: set[Edge] | None = None

    @staticmethod
    def of(graph: Graph[FlowNode, FlowRelation]) -> FlowTopologyGraph:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Edge:
        source: str | None = None
        target: str | None = None
        relation: FlowRelation | None = None

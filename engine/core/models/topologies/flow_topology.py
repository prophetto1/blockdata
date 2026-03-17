from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\topologies\FlowTopology.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.topologies.flow_node import FlowNode
from engine.core.models.topologies.flow_relation import FlowRelation
from engine.core.models.has_u_i_d import HasUID


@dataclass(slots=True, kw_only=True)
class FlowTopology:
    source: FlowNode
    relation: FlowRelation
    destination: FlowNode

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\topologies\FlowTopologyService.java
# WARNING: Unresolved types: Preconditions, trigger

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, Callable, ClassVar, Iterator

from engine.core.services.condition_service import ConditionService
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow import Flow
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.topologies.flow_node import FlowNode
from engine.core.models.topologies.flow_relation import FlowRelation
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.models.topologies.flow_topology import FlowTopology
from engine.core.models.topologies.flow_topology_graph import FlowTopologyGraph
from engine.core.repositories.flow_topology_repository_interface import FlowTopologyRepositoryInterface
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.models.label import Label


@dataclass(slots=True, kw_only=True)
class FlowTopologyService:
    simulated_execution: ClassVar[Label]
    logger: ClassVar[Logger] = getLogger(__name__)
    condition_service: ConditionService | None = None
    flow_repository: FlowRepositoryInterface | None = None
    flow_topology_repository: FlowTopologyRepositoryInterface | None = None

    def graph(self, flows: Iterator[FlowTopology], anonymize: Callable[FlowNode, FlowNode]) -> FlowTopologyGraph:
        raise NotImplementedError  # TODO: translate from Java

    def namespace_graph(self, tenant_id: str, namespace: str) -> FlowTopologyGraph:
        raise NotImplementedError  # TODO: translate from Java

    def topology(self, child: FlowWithSource, all_flows: list[FlowWithSource]) -> Iterator[FlowTopology]:
        raise NotImplementedError  # TODO: translate from Java

    def map(self, parent: FlowWithSource, child: FlowWithSource) -> FlowTopology:
        raise NotImplementedError  # TODO: translate from Java

    def is_child(self, parent: Flow, child: Flow) -> FlowRelation:
        raise NotImplementedError  # TODO: translate from Java

    def is_flow_task_child(self, parent: Flow, child: Flow) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_trigger_child(self, parent: Flow, child: Flow) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def validate_condition(self, condition: Condition, child: FlowInterface, execution: Execution) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def validate_multiple_conditions(self, multiple_conditions: dict[str, Condition], child: FlowInterface, execution: Execution) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_mandatory_multiple_condition(self, condition: Condition) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def validate_preconditions(self, preconditions: io.kestra.plugin.core.trigger.Flow.Preconditions, child: FlowInterface, execution: Execution) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_filter_condition(self, condition: Condition) -> bool:
        raise NotImplementedError  # TODO: translate from Java

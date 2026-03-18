from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\GraphService.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.core.models.hierarchies.abstract_graph import AbstractGraph
from engine.core.models.executions.execution import Execution
from engine.core.models.hierarchies.flow_graph import FlowGraph
from engine.core.exceptions.flow_processing_exception import FlowProcessingException
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.models.hierarchies.graph_cluster import GraphCluster
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.services.plugin_default_service import PluginDefaultService
from engine.core.runners.run_context_factory import RunContextFactory
from engine.core.repositories.trigger_repository_interface import TriggerRepositoryInterface


@dataclass(slots=True, kw_only=True)
class GraphService:
    logger: ClassVar[Logger] = getLogger(__name__)
    flow_repository: FlowRepositoryInterface | None = None
    trigger_repository: TriggerRepositoryInterface | None = None
    plugin_default_service: PluginDefaultService | None = None
    run_context_factory: RunContextFactory | None = None

    def flow_graph(self, flow: FlowWithSource, expanded_subflows: list[str], execution: Execution | None = None) -> FlowGraph:
        raise NotImplementedError  # TODO: translate from Java

    def execution_graph(self, flow: FlowWithSource, expanded_subflows: list[str], execution: Execution) -> FlowGraph:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, base_graph: GraphCluster, flow: FlowWithSource, expanded_subflows: list[str], flow_by_uid: dict[str, FlowWithSource], execution: Execution | None = None) -> GraphCluster:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TaskToClusterReplacer:
        parent_cluster: GraphCluster | None = None
        task_to_replace: AbstractGraph | None = None
        cluster_for_replacement: GraphCluster | None = None

        def replace(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

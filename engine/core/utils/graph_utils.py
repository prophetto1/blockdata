from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\GraphUtils.java
# WARNING: Unresolved types: DagTask, Edge, Pair, Triple

from dataclasses import dataclass
from typing import Any

from engine.core.models.hierarchies.abstract_graph import AbstractGraph
from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.plugin.core.flow.dag import Dag
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow import Flow
from engine.core.models.hierarchies.flow_graph import FlowGraph
from engine.core.models.hierarchies.graph_cluster import GraphCluster
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.hierarchies.relation import Relation
from engine.core.models.hierarchies.relation_type import RelationType
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.triggers.trigger import Trigger


@dataclass(slots=True, kw_only=True)
class GraphUtils:

    @staticmethod
    def flow_graph(flow: Flow, execution: Execution, triggers: list[Trigger] | None = None) -> FlowGraph:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(graph: GraphCluster, flow: Flow, execution: Execution | None = None, triggers: list[Trigger] | None = None) -> GraphCluster:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def triggers(graph: GraphCluster, triggers_declarations: list[AbstractTrigger], triggers: list[Trigger]) -> GraphCluster:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def nodes(graph_cluster: GraphCluster) -> list[AbstractGraph]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def raw_edges(graph_cluster: GraphCluster) -> list[Triple[AbstractGraph, AbstractGraph, Relation]]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def edges(graph_cluster: GraphCluster) -> list[FlowGraph.Edge]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def clusters(graph_cluster: GraphCluster, parents: list[str]) -> list[Pair[GraphCluster, list[str]]]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def successors(graph_cluster: GraphCluster, task_run_ids: set[str]) -> set[AbstractGraph]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def recursive_edge(edges: list[FlowGraph.Edge], selected_uuid: str) -> list[FlowGraph.Edge]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def sequential(graph: GraphCluster, tasks: list[Task], errors: list[Task], _finally: list[Task], after_execution: list[Task], parent: TaskRun, execution: Execution | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parallel(graph: GraphCluster, tasks: list[Task], errors: list[Task], _finally: list[Task], parent: TaskRun, execution: Execution) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def switch_case(graph: GraphCluster, tasks: dict[str, list[Task]], errors: list[Task], _finally: list[Task], parent: TaskRun, execution: Execution) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def if_else(graph: GraphCluster, then: list[Task], _else: list[Task], _finally: list[Task], errors: list[Task], parent: TaskRun, execution: Execution) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def dag(graph: GraphCluster, tasks: list[Dag.DagTask], errors: list[Task], _finally: list[Task], parent: TaskRun, execution: Execution) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def iterate(graph: GraphCluster, tasks: list[Task], errors: list[Task], _finally: list[Task], after_execution: list[Task], parent: TaskRun, execution: Execution, relation_type: RelationType | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def fill_alternative_paths(graph: GraphCluster, errors: list[Task], _finally: list[Task], after_execution: list[Task], parent: TaskRun, execution: Execution, value: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def remove_finally(graph: GraphCluster) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def remove_after_execution(graph: GraphCluster) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def fill_graph(graph: GraphCluster, tasks: list[Task], relation_type: RelationType, parent: TaskRun, execution: Execution, value: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_edge_target(current_graph: AbstractGraph) -> AbstractGraph:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def fill_graph_dag(graph: GraphCluster, tasks: list[Dag.DagTask], parent: TaskRun, execution: Execution) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_all_link_to_end(relation_type: RelationType) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def find_task_runs(task: Task, execution: Execution, parent: TaskRun) -> list[TaskRun]:
        raise NotImplementedError  # TODO: translate from Java

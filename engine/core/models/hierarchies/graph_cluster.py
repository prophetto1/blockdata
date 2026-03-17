from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\hierarchies\GraphCluster.java
# WARNING: Unresolved types: BranchType

from dataclasses import dataclass
from typing import Any

from engine.core.models.hierarchies.abstract_graph import AbstractGraph
from engine.core.models.hierarchies.abstract_graph_task import AbstractGraphTask
from engine.core.models.hierarchies.graph import Graph
from engine.core.models.hierarchies.graph_cluster_after_execution import GraphClusterAfterExecution
from engine.core.models.hierarchies.graph_cluster_end import GraphClusterEnd
from engine.core.models.hierarchies.graph_cluster_finally import GraphClusterFinally
from engine.core.models.hierarchies.graph_cluster_root import GraphClusterRoot
from engine.core.models.hierarchies.relation import Relation
from engine.core.models.hierarchies.relation_type import RelationType
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun


@dataclass(slots=True, kw_only=True)
class GraphCluster(AbstractGraph):
    graph: Graph[AbstractGraph, Relation]
    relation_type: RelationType | None = None
    root: GraphClusterRoot | None = None
    _finally: GraphClusterFinally | None = None
    after_execution: GraphClusterAfterExecution | None = None
    end: GraphClusterEnd | None = None
    task_node: AbstractGraphTask | None = None

    def get_finally(self) -> GraphClusterFinally:
        raise NotImplementedError  # TODO: translate from Java

    def add_node(self, node: AbstractGraph) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def add_node(self, node: AbstractGraph, with_cluster_uid_prefix: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def add_edge(self, source: AbstractGraph, target: AbstractGraph, relation: Relation) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def prefixed_uid(self, uid: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def all_nodes_by_parent(self) -> dict[GraphCluster, list[AbstractGraph]]:
        raise NotImplementedError  # TODO: translate from Java

    def get_uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def update_uid_with_children(self, uid: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def update_with_children(self, branch_type: BranchType) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def for_execution(self) -> AbstractGraph:
        raise NotImplementedError  # TODO: translate from Java

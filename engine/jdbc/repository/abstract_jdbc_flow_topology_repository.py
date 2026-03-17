from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\repository\AbstractJdbcFlowTopologyRepository.java
# WARNING: Unresolved types: DMLQuery, DSLContext, Record, io, jdbc, kestra

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.models.conditions.condition import Condition
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.topologies.flow_topology import FlowTopology
from engine.core.repositories.flow_topology_repository_interface import FlowTopologyRepositoryInterface
from engine.jdbc.runner.jdbc_queue_indexer_interface import JdbcQueueIndexerInterface


@dataclass(slots=True, kw_only=True)
class AbstractJdbcFlowTopologyRepository(ABC, AbstractJdbcRepository):
    jdbc_repository: io.kestra.jdbc.AbstractJdbcRepository[FlowTopology] | None = None

    def find_by_flow(self, tenant_id: str, namespace: str, flow_id: str, destination_only: bool) -> list[FlowTopology]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_namespace(self, tenant_id: str, namespace: str) -> list[FlowTopology]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_namespace_prefix(self, tenant_id: str, namespace_prefix: str) -> list[FlowTopology]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all(self, tenant_id: str) -> list[FlowTopology]:
        raise NotImplementedError  # TODO: translate from Java

    def save(self, flow: FlowInterface, flow_topologies: list[FlowTopology]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def build_merge_statement(self, context: DSLContext, flow_topology: FlowTopology) -> DMLQuery[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def save(self, flow_topology: FlowTopology) -> FlowTopology:
        raise NotImplementedError  # TODO: translate from Java

    def save(self, dsl_context: DSLContext, flow_topology: FlowTopology) -> FlowTopology:
        raise NotImplementedError  # TODO: translate from Java

    def build_tenant_condition(self, prefix: str, tenant_id: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

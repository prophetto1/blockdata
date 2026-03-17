from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresFlowTopologyRepository.java
# WARNING: Unresolved types: DMLQuery

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_flow_topology_repository import AbstractJdbcFlowTopologyRepository
from engine.core.models.topologies.flow_topology import FlowTopology
from engine.repository.postgres.postgres_repository import PostgresRepository


@dataclass(slots=True, kw_only=True)
class PostgresFlowTopologyRepository(AbstractJdbcFlowTopologyRepository):

    def build_merge_statement(self, context: DSLContext, flow_topology: FlowTopology) -> DMLQuery[Record]:
        raise NotImplementedError  # TODO: translate from Java

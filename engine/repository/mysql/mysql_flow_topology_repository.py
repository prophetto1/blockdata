from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\repository\mysql\MysqlFlowTopologyRepository.java
# WARNING: Unresolved types: DMLQuery

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_flow_topology_repository import AbstractJdbcFlowTopologyRepository
from engine.core.models.topologies.flow_topology import FlowTopology
from engine.repository.mysql.mysql_repository import MysqlRepository


@dataclass(slots=True, kw_only=True)
class MysqlFlowTopologyRepository(AbstractJdbcFlowTopologyRepository):

    def build_merge_statement(self, context: DSLContext, flow_topology: FlowTopology) -> DMLQuery[Record]:
        raise NotImplementedError  # TODO: translate from Java

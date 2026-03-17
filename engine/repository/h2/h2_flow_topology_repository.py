from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\repository\h2\H2FlowTopologyRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_flow_topology_repository import AbstractJdbcFlowTopologyRepository
from engine.core.models.topologies.flow_topology import FlowTopology
from engine.repository.h2.h2_repository import H2Repository


@dataclass(slots=True, kw_only=True)
class H2FlowTopologyRepository(AbstractJdbcFlowTopologyRepository):
    pass

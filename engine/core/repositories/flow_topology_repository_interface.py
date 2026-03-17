from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\repositories\FlowTopologyRepositoryInterface.java

from typing import Any, Protocol

from engine.core.models.topologies.flow_topology import FlowTopology


class FlowTopologyRepositoryInterface(Protocol):
    def find_by_flow(self, tenant_id: str, namespace: str, flow_id: str, destination_only: bool) -> list[FlowTopology]: ...

    def find_by_namespace(self, tenant_id: str, namespace: str) -> list[FlowTopology]: ...

    def find_by_namespace_prefix(self, tenant_id: str, namespace_prefix: str) -> list[FlowTopology]: ...

    def find_all(self, tenant_id: str) -> list[FlowTopology]: ...

    def save(self, flow_topology: FlowTopology) -> FlowTopology: ...

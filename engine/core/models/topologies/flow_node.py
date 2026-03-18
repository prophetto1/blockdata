from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\topologies\FlowNode.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.tenant_interface import TenantInterface


@dataclass(slots=True, kw_only=True)
class FlowNode:
    uid: str
    tenant_id: str | None = None
    namespace: str | None = None
    id: str | None = None

    def equals(self, o: Any) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def hash_code(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(flow: FlowInterface) -> FlowNode:
        raise NotImplementedError  # TODO: translate from Java

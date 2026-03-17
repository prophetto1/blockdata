from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\DefaultFlowMetaStore.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.services.flow_listeners_interface import FlowListenersInterface
from engine.core.runners.flow_meta_store_interface import FlowMetaStoreInterface
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.models.flows.flow_with_source import FlowWithSource


@dataclass(slots=True, kw_only=True)
class DefaultFlowMetaStore:
    flow_repository: FlowRepositoryInterface | None = None
    all_flows: list[FlowWithSource] | None = None

    def all_last_version(self) -> list[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_id(self, tenant_id: str, namespace: str, id: str, revision: Optional[int]) -> Optional[FlowInterface]:
        raise NotImplementedError  # TODO: translate from Java

    def is_ready(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

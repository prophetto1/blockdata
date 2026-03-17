from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\services\FlowFilesManager.java

from typing import Any, Protocol

from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.models.flows.generic_flow import GenericFlow


class FlowFilesManager(Protocol):
    def create_or_update_flow(self, flow: GenericFlow) -> FlowWithSource: ...

    def delete_flow(self, tenant_id: str, namespace: str | None = None, id: str | None = None) -> None: ...

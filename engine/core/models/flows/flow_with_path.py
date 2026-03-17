from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\FlowWithPath.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.flow_interface import FlowInterface


@dataclass(slots=True, kw_only=True)
class FlowWithPath:
    flow: FlowInterface | None = None
    tenant_id: str | None = None
    id: str | None = None
    namespace: str | None = None
    path: str | None = None

    @staticmethod
    def of(flow: FlowInterface, path: str) -> FlowWithPath:
        raise NotImplementedError  # TODO: translate from Java

    def uid_without_revision(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

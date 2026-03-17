from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\assets\AssetUser.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.flows.flow_id import FlowId
from engine.core.models.has_u_i_d import HasUID
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class AssetUser:
    tenant_id: str | None = None
    namespace: str | None = None
    flow_id: str | None = None
    flow_revision: int | None = None
    execution_id: str | None = None
    task_id: str | None = None
    task_run_id: str | None = None
    state: State.Type | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_flow_id(self) -> FlowId:
        raise NotImplementedError  # TODO: translate from Java

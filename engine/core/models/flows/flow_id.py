from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\FlowId.java

from dataclasses import dataclass
from typing import Any, Optional, Protocol

from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.trigger import Trigger


class FlowId(Protocol):
    def get_id(self) -> str: ...

    def get_namespace(self) -> str: ...

    def get_revision(self) -> int: ...

    def get_tenant_id(self) -> str: ...

    def uid(tenant_id: str, namespace: str | None = None, id: str | None = None, revision: Optional[int] | None = None) -> str: ...

    def uid_without_revision(tenant_id: str, namespace: str | None = None, id: str | None = None) -> str: ...

    def of(tenant_id: str, namespace: str, id: str, revision: int) -> FlowId: ...

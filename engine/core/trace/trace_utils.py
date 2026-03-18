from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\trace\TraceUtils.java
# WARNING: Unresolved types: AttributeKey, Attributes

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.executions.execution import Execution
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class TraceUtils:
    attr_uid: ClassVar[AttributeKey[str]]
    attr_tenant_id: ClassVar[AttributeKey[str]]
    attr_namespace: ClassVar[AttributeKey[str]]
    attr_flow_id: ClassVar[AttributeKey[str]]
    attr_execution_id: ClassVar[AttributeKey[str]]
    attr_source: ClassVar[AttributeKey[str]]

    @staticmethod
    def attributes_from(execution: Execution) -> Attributes:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-servicenow\src\main\java\io\kestra\plugin\servicenow\Update.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.servicenow.abstract_service_now import AbstractServiceNow
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Update(AbstractServiceNow):
    """Update a ServiceNow record by sys_id"""
    table: Property[str]
    sys_id: Property[str]
    data: Property[dict[str, Any]]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        result: dict[str, Any] | None = None

    @dataclass(slots=True)
    class UpdateResult:
        result: dict[str, Any] | None = None

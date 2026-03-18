from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-servicenow\src\main\java\io\kestra\plugin\servicenow\Delete.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.servicenow.abstract_service_now import AbstractServiceNow
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Delete(AbstractServiceNow):
    """Delete a ServiceNow record by sys_id"""
    table: Property[str]
    sys_id: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        deleted: bool | None = None

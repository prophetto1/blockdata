from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-servicenow\src\main\java\io\kestra\plugin\servicenow\Get.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.servicenow.abstract_service_now import AbstractServiceNow
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Get(AbstractServiceNow):
    """Fetch records from a ServiceNow table"""
    table: Property[str]

    def run(self, run_context: RunContext) -> Get.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        results: list[dict[str, Any]] | None = None
        size: int | None = None

    @dataclass(slots=True)
    class GetResult:
        result: list[dict[str, Any]] | None = None

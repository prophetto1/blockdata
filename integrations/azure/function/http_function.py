from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\function\HttpFunction.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class HttpFunction(Task):
    """Invoke an Azure Function over HTTP"""
    http_method: Property[str]
    url: Property[str]
    http_body: Property[dict[str, Any]] = Property.ofValue(new HashMap<>())
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofMinutes(60))

    def run(self, run_context: RunContext) -> HttpFunction.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        repsonse_body: Any | None = None

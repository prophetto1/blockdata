from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airtable\src\main\java\io\kestra\plugin\airtable\records\Update.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class Update(Task):
    """Patch fields on an Airtable record"""
    base_id: Property[str]
    table_id: Property[str]
    record_id: Property[str]
    api_key: Property[str]
    fields: Property[dict[str, Any]]
    typecast: Property[bool] = Property.ofValue(false)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        record: dict[str, Any] | None = None
        record_id: str | None = None

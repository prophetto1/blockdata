from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airtable\src\main\java\io\kestra\plugin\airtable\records\Get.java
# WARNING: Unresolved types: Exception, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class Get(Task):
    """Fetch Airtable record by ID"""
    base_id: Property[str]
    table_id: Property[str]
    record_id: Property[str]
    api_key: Property[str]
    fail_on_missing: Property[bool] = Property.ofValue(false)
    fields: Property[java.util.List[str]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        record: dict[str, Any] | None = None

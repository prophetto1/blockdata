from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airtable\src\main\java\io\kestra\plugin\airtable\records\Create.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.airtable.airtable_record import AirtableRecord
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class Create(Task):
    """Create Airtable records (single or batch)"""
    base_id: Property[str]
    table_id: Property[str]
    api_key: Property[str]
    typecast: Property[bool] = Property.ofValue(false)
    fields: Property[dict[str, Any]] | None = None
    records: Property[list[dict[str, Any]]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def convert_record_to_map(self, record: AirtableRecord) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        record: dict[str, Any] | None = None
        records: list[dict[str, Any]] | None = None
        record_ids: list[str] | None = None

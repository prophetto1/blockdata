from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airtable\src\main\java\io\kestra\plugin\airtable\records\List.java
# WARNING: Unresolved types: Exception, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.airtable.airtable_record import AirtableRecord
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class List(Task):
    """List Airtable records with filters"""
    base_id: Property[str]
    table_id: Property[str]
    api_key: Property[str]
    enable_auto_pagination: Property[bool] = Property.ofValue(false)
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.FETCH)
    filter_by_formula: Property[str] | None = None
    fields: Property[java.util.List[str]] | None = None
    max_records: Property[int] | None = None
    view: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_output(self, run_context: RunContext, records: java.util.List[AirtableRecord], fetch_type: FetchType, total_fetched: int) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def convert_record_to_map(self, record: AirtableRecord) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        row: dict[str, Any] | None = None
        rows: java.util.List[dict[str, Any]] | None = None
        uri: str | None = None
        size: int | None = None

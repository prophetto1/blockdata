from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\StorageWrite.java
# WARNING: Unresolved types: BigQueryWriteClient, Builder, Exception, IOException, JSONObject, JsonStreamWriter, TableId, TableName, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class StorageWrite(AbstractTask):
    """Stream a file to BigQuery via Storage Write API"""
    destination_table: Property[str]
    write_stream_type: Property[WriteStreamType] = Property.ofValue(WriteStreamType.DEFAULT)
    buffer_size: Property[int] = Property.ofValue(1000)
    from: Property[str] | None = None
    location: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def map(self, object: Any) -> JSONObject:
        raise NotImplementedError  # TODO: translate from Java

    def transform(self, object: Any) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def connection(self, run_context: RunContext) -> BigQueryWriteClient:
        raise NotImplementedError  # TODO: translate from Java

    def tags(self, table_id: TableId, run_context: RunContext) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def json_stream_writer(self, run_context: RunContext, parent_table: TableName, client: BigQueryWriteClient) -> JsonStreamWriter.Builder:
        raise NotImplementedError  # TODO: translate from Java

    class WriteStreamType(str, Enum):
        DEFAULT = "DEFAULT"
        COMMITTED = "COMMITTED"
        PENDING = "PENDING"

    @dataclass(slots=True)
    class Output:
        rows: int | None = None
        rows_count: int | None = None
        commit_time: datetime | None = None

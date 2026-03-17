from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\parquet\ParquetToIon.java
# WARNING: Unresolved types: Consumer, Exception, FluxSink, GenericRecord, IOException, ParquetReader, apache, core, hadoop, io, kestra, models, org, parquet, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class ParquetToIon(Task):
    """Convert a Parquet file into ION."""
    from: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def next_row(self, parquet_reader: org.apache.parquet.hadoop.ParquetReader[GenericRecord]) -> Consumer[FluxSink[GenericRecord]]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None

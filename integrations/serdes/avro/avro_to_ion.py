from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\avro\AvroToIon.java
# WARNING: Unresolved types: DataFileStream, Exception, FluxSink, GenericRecord, IOException, RuntimeException, Throwable, apache, avro, core, io, kestra, models, org, tasks

from dataclasses import dataclass
from typing import Any

from integrations.serdes.on_bad_lines import OnBadLines
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.gcp.bigquery.models.schema import Schema
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AvroToIon(Task):
    """Convert an Avro file into ION with configurable error handling."""
    from: Property[str]
    on_bad_lines: Property[OnBadLines] = Property.ofValue(OnBadLines.ERROR)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def next_row(self, data_file_stream: DataFileStream[GenericRecord], avro_schema: org.apache.avro.Schema, on_bad_lines_value: OnBadLines, run_context: RunContext, sink: FluxSink[GenericRecord]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def validate_field_type(self, value: Any, field_schema: org.apache.avro.Schema, field_name: str, on_bad_lines_value: OnBadLines, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def validate_int(self, value: Any, field_name: str, on_bad_lines_value: OnBadLines, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def validate_long(self, value: Any, field_name: str, on_bad_lines_value: OnBadLines, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def validate_float(self, value: Any, field_name: str, on_bad_lines_value: OnBadLines, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def validate_double(self, value: Any, field_name: str, on_bad_lines_value: OnBadLines, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def validate_string(self, value: Any, field_name: str, on_bad_lines_value: OnBadLines, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def validate_boolean(self, value: Any, field_name: str, on_bad_lines_value: OnBadLines, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def validate_union(self, value: Any, field_schema: org.apache.avro.Schema, field_name: str, on_bad_lines_value: OnBadLines, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def validate_array(self, value: Any, field_schema: org.apache.avro.Schema, field_name: str, on_bad_lines_value: OnBadLines, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def validate_map(self, value: Any, field_schema: org.apache.avro.Schema, field_name: str, on_bad_lines_value: OnBadLines, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def validate_record(self, value: Any, field_schema: org.apache.avro.Schema, field_name: str, on_bad_lines_value: OnBadLines, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def validate_null(self, value: Any, field_name: str, on_bad_lines_value: OnBadLines, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def is_nullable(self, schema: org.apache.avro.Schema) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None

    @dataclass(slots=True)
    class IllegalCellConversion(RuntimeException):
        pass

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.serdes.avro.avro_converter import AvroConverter
from integrations.kafka.serdes.generic_data import GenericData
from integrations.serdes.on_bad_lines import OnBadLines
from engine.core.models.property.property import Property
from integrations.pulsar.reader import Reader
from engine.core.utils.rethrow import Rethrow
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractAvroConverter(Task):
    schema: str | None = None
    number_of_rows_to_scan: Property[int] | None = None
    true_values: Property[list[String]] | None = None
    false_values: Property[list[String]] | None = None
    null_values: Property[list[String]] | None = None
    date_format: str = "yyyy-MM-dd[XXX]"
    time_format: str = "HH:mm[:ss][.SSSSSS][XXX]"
    datetime_format: str = "yyyy-MM-dd'T'HH:mm[:ss][.SSSSSS][XXX]"
    decimal_separator: Property[Character] | None = None
    strict_schema: Property[bool] | None = None
    infer_all_fields: Property[bool] | None = None
    time_zone_id: Property[str] | None = None
    on_bad_lines: Property[OnBadLines] | None = None

    def convert(self, input_stream: Reader, schema: org, consumer: Rethrow, run_context: RunContext) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def convert_to_avro(self, schema: org, converter: AvroConverter, on_bad_lines: OnBadLines) -> Function[Object, GenericData]:
        raise NotImplementedError  # TODO: translate from Java

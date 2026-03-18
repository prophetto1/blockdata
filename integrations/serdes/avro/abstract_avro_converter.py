from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\avro\AbstractAvroConverter.java
# WARNING: Unresolved types: ConsumerChecked, E, Exception, Function, IOException, apache, avro, org

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.serdes.avro.avro_converter import AvroConverter
from integrations.kafka.serdes.generic_data import GenericData
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.serdes.on_bad_lines import OnBadLines
from engine.core.models.property.property import Property
from integrations.pulsar.reader import Reader
from integrations.aws.kinesis.model.record import Record
from engine.core.utils.rethrow import Rethrow
from engine.core.runners.run_context import RunContext
from integrations.gcp.bigquery.models.schema import Schema
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractAvroConverter(ABC, Task):
    number_of_rows_to_scan: Property[int] = Property.ofValue(100)
    true_values: Property[list[str]] = Property.ofValue(Arrays.asList("t", "true", "enabled", "1", "on", "yes"))
    false_values: Property[list[str]] = Property.ofValue(Arrays.asList("f", "false", "disabled", "0", "off", "no", ""))
    null_values: Property[list[str]] = Property.ofValue(Arrays.asList(
        "",
        "#N/A",
        "#N/A N/A",
        "#NA",
        "-1.#IND",
        "-1.#QNAN",
        "-NaN",
        "1.#IND",
        "1.#QNAN",
        "NA",
        "n/a",
        "nan",
        "null"
    ))
    date_format: str = "yyyy-MM-dd[XXX]"
    time_format: str = "HH:mm[:ss][.SSSSSS][XXX]"
    datetime_format: str = "yyyy-MM-dd'T'HH:mm[:ss][.SSSSSS][XXX]"
    decimal_separator: Property[char] = Property.ofValue('.')
    strict_schema: Property[bool] = Property.ofValue(Boolean.FALSE)
    infer_all_fields: Property[bool] = Property.ofValue(false)
    time_zone_id: Property[str] = Property.ofValue(ZoneId.systemDefault().toString())
    on_bad_lines: Property[OnBadLines] = Property.ofValue(OnBadLines.ERROR)
    schema: str | None = None

    def convert(self, input_stream: Reader, schema: org.apache.avro.Schema, consumer: Rethrow.ConsumerChecked[GenericData.Record, E], run_context: RunContext) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def convert_to_avro(self, schema: org.apache.avro.Schema, converter: AvroConverter, on_bad_lines: OnBadLines) -> Function[Any, GenericData.Record]:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\avro\AvroConverter.java
# WARNING: Unresolved types: ByteBuffer, EnumSymbol, Exception, Fixed, JsonProcessingException, Throwable, Utf8, ZoneId

from dataclasses import dataclass, field
from datetime import date
from datetime import datetime
from datetime import time
from typing import Any, ClassVar

from integrations.gcp.bigquery.models.field import Field
from integrations.kafka.serdes.generic_data import GenericData
from integrations.serdes.on_bad_lines import OnBadLines
from integrations.aws.kinesis.model.record import Record
from integrations.gcp.bigquery.models.schema import Schema


@dataclass(slots=True, kw_only=True)
class AvroConverter:
    schema: str
    true_values: list[str] = Arrays.asList("t", "true", "enabled", "1", "on", "yes")
    false_values: list[str] = Arrays.asList("f", "false", "disabled", "0", "off", "no", "")
    null_values: list[str] = Arrays.asList(
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
    )
    date_format: str = "yyyy-MM-dd[XXX]"
    time_format: str = "HH:mm[:ss][.SSSSSS][XXX]"
    datetime_format: str = "yyyy-MM-dd'T'HH:mm[:ss][.SSSSSS][XXX]"
    decimal_separator: char = '.'
    strict_schema: bool = Boolean.FALSE
    infer_all_fields: bool = False
    time_zone_id: str = ZoneId.systemDefault().toString()
    on_bad_lines: OnBadLines = OnBadLines.ERROR
    g_e_n_e_r_i_c__d_a_t_a: ClassVar[GenericData] = new GenericData()

    @staticmethod
    def generic_data() -> GenericData:
        raise NotImplementedError  # TODO: translate from Java

    def get_value_from_name_or_aliases(self, field: Schema.Field, data: dict[str, Any]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def from_map(self, schema: Schema, data: dict[str, Any]) -> GenericData.Record:
        raise NotImplementedError  # TODO: translate from Java

    def from_map(self, schema: Schema, data: dict[str, Any], on_bad_lines: OnBadLines) -> GenericData.Record:
        raise NotImplementedError  # TODO: translate from Java

    def from_map(self, schema: Schema, data: dict[str, Any], on_bad_lines: OnBadLines, parent_field_name: str) -> GenericData.Record:
        raise NotImplementedError  # TODO: translate from Java

    def from_array(self, schema: Schema, data: list[Any], on_bad_lines: OnBadLines) -> GenericData.Record:
        raise NotImplementedError  # TODO: translate from Java

    def convert(self, schema: Schema, data: Any, on_bad_lines: OnBadLines, field_name: str) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def convert_decimal_separator(self, value: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def logical_decimal(self, schema: Schema, data: Any) -> float:
        raise NotImplementedError  # TODO: translate from Java

    def logical_uuid(self, data: Any) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def logical_date(self, data: Any) -> date:
        raise NotImplementedError  # TODO: translate from Java

    def logical_time_millis(self, data: Any) -> time:
        raise NotImplementedError  # TODO: translate from Java

    def logical_time_micros(self, data: Any) -> time:
        raise NotImplementedError  # TODO: translate from Java

    def convert_java_time(self, data: Any) -> time:
        raise NotImplementedError  # TODO: translate from Java

    def logical_timestamp_millis(self, data: Any) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def convert_java_date_time(self, data: Any) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def parse_date_time(self, data: str) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def logical_timestamp_micros(self, data: Any) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def complex_array(self, schema: Schema, data: Any, on_bad_lines: OnBadLines, field_name: str) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def complex_union(self, schema: Schema, data: Any, on_bad_lines: OnBadLines, field_name: str) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def complex_fixed(self, schema: Schema, data: Any) -> GenericData.Fixed:
        raise NotImplementedError  # TODO: translate from Java

    def complex_map(self, schema: Schema, data: Any, on_bad_lines: OnBadLines, field_name: str) -> dict[Utf8, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def complex_enum(self, schema: Schema, data: Any) -> GenericData.EnumSymbol:
        raise NotImplementedError  # TODO: translate from Java

    def primitive_null(self, data: Any) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def primitive_int(self, data: Any) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def primitive_long(self, data: Any) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def primitive_float(self, data: Any) -> float:
        raise NotImplementedError  # TODO: translate from Java

    def primitive_double(self, data: Any) -> float:
        raise NotImplementedError  # TODO: translate from Java

    def primitive_bool(self, data: Any) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def primitive_string(self, data: Any) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def primitive_bytes(self, data: Any) -> ByteBuffer:
        raise NotImplementedError  # TODO: translate from Java

    def contains(self, list: list[str], data: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def zone_id(self) -> ZoneId:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def trim_exception_message(data: Any) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class IllegalRow(Exception):
        data: Any | None = None

        def to_string(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class IllegalRowConvertion(Exception):
        field: Schema.Field | None = None
        data: Any | None = None

        def to_string(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class IllegalStrictRowConversion(Exception):
        schema: Schema | None = None
        fields: list[str] | None = None
        values: list[Any] | None = None

        def to_string(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class IllegalCellConversion(Exception):
        data: Any | None = None
        schema: Schema | None = None

        def to_string(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

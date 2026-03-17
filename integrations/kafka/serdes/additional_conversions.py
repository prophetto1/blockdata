from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kafka\src\main\java\io\kestra\plugin\kafka\serdes\AdditionalConversions.java
# WARNING: Unresolved types: Class, Conversion, LogicalType, OffsetDateTime, TimeConversions, TimestampMicrosConversion, TimestampMillisConversion

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.gcp.bigquery.models.schema import Schema


@dataclass(slots=True, kw_only=True)
class AdditionalConversions:

    @dataclass(slots=True)
    class OffsetDateTimeMicrosConversion(Conversion):
        timestamp_micros_conversion: TimeConversions.TimestampMicrosConversion = new TimeConversions.TimestampMicrosConversion()

        def get_converted_type(self) -> Class[OffsetDateTime]:
            raise NotImplementedError  # TODO: translate from Java

        def get_logical_type_name(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def adjust_and_set_value(self, var_name: str, val_param_name: str) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def from_long(self, micros_from_epoch: int, schema: Schema, type: LogicalType) -> OffsetDateTime:
            raise NotImplementedError  # TODO: translate from Java

        def to_long(self, odt: OffsetDateTime, schema: Schema, type: LogicalType) -> int:
            raise NotImplementedError  # TODO: translate from Java

        def get_recommended_schema(self) -> Schema:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class OffsetDateTimeMillisConversion(Conversion):
        timestamp_millis_conversion: TimeConversions.TimestampMillisConversion = new TimeConversions.TimestampMillisConversion()

        def get_converted_type(self) -> Class[OffsetDateTime]:
            raise NotImplementedError  # TODO: translate from Java

        def get_logical_type_name(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def adjust_and_set_value(self, var_name: str, val_param_name: str) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def from_long(self, millis_from_epoch: int, schema: Schema, type: LogicalType) -> OffsetDateTime:
            raise NotImplementedError  # TODO: translate from Java

        def to_long(self, odt: OffsetDateTime, schema: Schema, type: LogicalType) -> int:
            raise NotImplementedError  # TODO: translate from Java

        def get_recommended_schema(self) -> Schema:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ZonedDateTimeMicrosConversion(Conversion):
        timestamp_micros_conversion: TimeConversions.TimestampMicrosConversion = new TimeConversions.TimestampMicrosConversion()

        def get_converted_type(self) -> Class[datetime]:
            raise NotImplementedError  # TODO: translate from Java

        def get_logical_type_name(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def adjust_and_set_value(self, var_name: str, val_param_name: str) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def from_long(self, micros_from_epoch: int, schema: Schema, type: LogicalType) -> datetime:
            raise NotImplementedError  # TODO: translate from Java

        def to_long(self, zdt: datetime, schema: Schema, type: LogicalType) -> int:
            raise NotImplementedError  # TODO: translate from Java

        def get_recommended_schema(self) -> Schema:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ZonedDateTimeMillisConversion(Conversion):
        timestamp_millis_conversion: TimeConversions.TimestampMillisConversion = new TimeConversions.TimestampMillisConversion()

        def get_converted_type(self) -> Class[datetime]:
            raise NotImplementedError  # TODO: translate from Java

        def get_logical_type_name(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def adjust_and_set_value(self, var_name: str, val_param_name: str) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def from_long(self, millis_from_epoch: int, schema: Schema, type: LogicalType) -> datetime:
            raise NotImplementedError  # TODO: translate from Java

        def to_long(self, zdt: datetime, schema: Schema, type: LogicalType) -> int:
            raise NotImplementedError  # TODO: translate from Java

        def get_recommended_schema(self) -> Schema:
            raise NotImplementedError  # TODO: translate from Java

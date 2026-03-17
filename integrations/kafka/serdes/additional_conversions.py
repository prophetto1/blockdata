from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from engine.core.docs.schema import Schema


@dataclass(slots=True, kw_only=True)
class AdditionalConversions:
    pass

    @dataclass(slots=True)
    class OffsetDateTimeMicrosConversion(Conversion):
        timestamp_micros_conversion: TimeConversions | None = None

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
        timestamp_millis_conversion: TimeConversions | None = None

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
        timestamp_micros_conversion: TimeConversions | None = None

        def get_converted_type(self) -> Class[ZonedDateTime]:
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
        timestamp_millis_conversion: TimeConversions | None = None

        def get_converted_type(self) -> Class[ZonedDateTime]:
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


@dataclass(slots=True, kw_only=True)
class OffsetDateTimeMicrosConversion(Conversion):
    timestamp_micros_conversion: TimeConversions | None = None

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


@dataclass(slots=True, kw_only=True)
class OffsetDateTimeMillisConversion(Conversion):
    timestamp_millis_conversion: TimeConversions | None = None

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


@dataclass(slots=True, kw_only=True)
class ZonedDateTimeMicrosConversion(Conversion):
    timestamp_micros_conversion: TimeConversions | None = None

    def get_converted_type(self) -> Class[ZonedDateTime]:
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


@dataclass(slots=True, kw_only=True)
class ZonedDateTimeMillisConversion(Conversion):
    timestamp_millis_conversion: TimeConversions | None = None

    def get_converted_type(self) -> Class[ZonedDateTime]:
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

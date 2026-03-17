from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\avro\AvroDeserializer.java
# WARNING: Unresolved types: DateConversion, DecimalConversion, GenericRecord, LocalTimestampMicrosConversion, LocalTimestampMillisConversion, LogicalType, TimeMicrosConversion, TimeMillisConversion, TimestampMicrosConversion, TimestampMillisConversion, UUIDConversion

from dataclasses import dataclass, field
from datetime import date
from datetime import datetime
from datetime import time
from typing import Any, ClassVar

from integrations.gcp.bigquery.models.schema import Schema
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class AvroDeserializer:
    d_e_c_i_m_a_l: ClassVar[str] = "decimal"
    u_u_i_d: ClassVar[str] = "uuid"
    d_a_t_e: ClassVar[str] = "date"
    t_i_m_e__m_i_l_l_i_s: ClassVar[str] = "time-millis"
    t_i_m_e__m_i_c_r_o_s: ClassVar[str] = "time-micros"
    t_i_m_e_s_t_a_m_p__m_i_l_l_i_s: ClassVar[str] = "timestamp-millis"
    t_i_m_e_s_t_a_m_p__m_i_c_r_o_s: ClassVar[str] = "timestamp-micros"
    l_o_c_a_l__t_i_m_e_s_t_a_m_p__m_i_l_l_i_s: ClassVar[str] = "local-timestamp-millis"
    l_o_c_a_l__t_i_m_e_s_t_a_m_p__m_i_c_r_o_s: ClassVar[str] = "local-timestamp-micros"
    d_e_c_i_m_a_l__c_o_n_v_e_r_s_i_o_n: ClassVar[DecimalConversion] = new DecimalConversion()
    u_u_i_d__c_o_n_v_e_r_s_i_o_n: ClassVar[UUIDConversion] = new UUIDConversion()
    d_a_t_e__c_o_n_v_e_r_s_i_o_n: ClassVar[DateConversion] = new DateConversion()
    t_i_m_e__m_i_c_r_o_s__c_o_n_v_e_r_s_i_o_n: ClassVar[TimeMicrosConversion] = new TimeMicrosConversion()
    t_i_m_e__m_i_l_l_i_s__c_o_n_v_e_r_s_i_o_n: ClassVar[TimeMillisConversion] = new TimeMillisConversion()
    t_i_m_e_s_t_a_m_p__m_i_c_r_o_s__c_o_n_v_e_r_s_i_o_n: ClassVar[TimestampMicrosConversion] = new TimestampMicrosConversion()
    t_i_m_e_s_t_a_m_p__m_i_l_l_i_s__c_o_n_v_e_r_s_i_o_n: ClassVar[TimestampMillisConversion] = new TimestampMillisConversion()
    l_o_c_a_l__t_i_m_e_s_t_a_m_p__m_i_c_r_o_s__c_o_n_v_e_r_s_i_o_n: ClassVar[LocalTimestampMicrosConversion] = new LocalTimestampMicrosConversion()
    l_o_c_a_l__t_i_m_e_s_t_a_m_p__m_i_l_l_i_s__c_o_n_v_e_r_s_i_o_n: ClassVar[LocalTimestampMillisConversion] = new LocalTimestampMillisConversion()

    @staticmethod
    def record_deserializer(record: GenericRecord) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def object_deserializer(value: Any, schema: Schema) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def union_deserializer(value: Any, schema: Schema) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def map_deserializer(value: dict[str, Any], schema: Schema) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def array_deserializer(value: list[Any], schema: Schema) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def timestamp_micros_deserializer(value: Any, schema: Schema, primitive_type: Type, logical_type: LogicalType) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def timestamp_millis_deserializer(value: Any, schema: Schema, primitive_type: Type, logical_type: LogicalType) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def local_timestamp_micros_deserializer(value: Any, schema: Schema, primitive_type: Type, logical_type: LogicalType) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def local_timestamp_millis_deserializer(value: Any, schema: Schema, primitive_type: Type, logical_type: LogicalType) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def time_micros_deserializer(value: Any, schema: Schema, primitive_type: Type, logical_type: LogicalType) -> time:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def time_millis_deserializer(value: Any, schema: Schema, primitive_type: Type, logical_type: LogicalType) -> time:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def date_deserializer(value: Any, schema: Schema, primitive_type: Type, logical_type: LogicalType) -> date:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def uuid_deserializer(value: Any, schema: Schema, primitive_type: Type, logical_type: LogicalType) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def decimal_deserializer(value: Any, schema: Schema, primitive_type: Type, logical_type: LogicalType) -> float:
        raise NotImplementedError  # TODO: translate from Java

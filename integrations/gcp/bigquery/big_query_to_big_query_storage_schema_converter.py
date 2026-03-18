from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\BigQueryToBigQueryStorageSchemaConverter.java
# WARNING: Unresolved types: Builder, ImmutableMap, Mode, StandardSQLTypeName, TableFieldSchema, TableSchema

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.gcp.bigquery.models.field import Field
from integrations.gcp.bigquery.models.schema import Schema
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class BigQueryToBigQueryStorageSchemaConverter:
    b_q__t_a_b_l_e__s_c_h_e_m_a__m_o_d_e__m_a_p: ClassVar[ImmutableMap[Field.Mode, TableFieldSchema.Mode]] = ImmutableMap.of(
            Field.Mode.NULLABLE, TableFieldSchema.Mode.NULLABLE,
            Field.Mode.REPEATED, TableFieldSchema.Mode.REPEATED,
            Field.Mode.REQUIRED, TableFieldSchema.Mode.REQUIRED
        )
    b_q__t_a_b_l_e__s_c_h_e_m_a__t_y_p_e__m_a_p: ImmutableMap[StandardSQLTypeName, TableFieldSchema.Type] = new ImmutableMap.Builder<StandardSQLTypeName, TableFieldSchema.Type>()
            .put(StandardSQLTypeName.BOOL, TableFieldSchema.Type.BOOL)
            .put(StandardSQLTypeName.BYTES, TableFieldSchema.Type.BYTES)
            .put(StandardSQLTypeName.DATE, TableFieldSchema.Type.DATE)
            .put(StandardSQLTypeName.DATETIME, TableFieldSchema.Type.DATETIME)
            .put(StandardSQLTypeName.FLOAT64, TableFieldSchema.Type.DOUBLE)
            .put(StandardSQLTypeName.GEOGRAPHY, TableFieldSchema.Type.GEOGRAPHY)
            .put(StandardSQLTypeName.INT64, TableFieldSchema.Type.INT64)
            .put(StandardSQLTypeName.NUMERIC, TableFieldSchema.Type.NUMERIC)
            .put(StandardSQLTypeName.STRING, TableFieldSchema.Type.STRING)
            .put(StandardSQLTypeName.STRUCT, TableFieldSchema.Type.STRUCT)
            .put(StandardSQLTypeName.TIME, TableFieldSchema.Type.TIME)
            .put(StandardSQLTypeName.TIMESTAMP, TableFieldSchema.Type.TIMESTAMP)
            .put(StandardSQLTypeName.BIGNUMERIC, TableFieldSchema.Type.BIGNUMERIC)
            .put(StandardSQLTypeName.JSON, TableFieldSchema.Type.JSON)
            .put(StandardSQLTypeName.INTERVAL, TableFieldSchema.Type.INTERVAL)
            .build()

    @staticmethod
    def convert_table_schema(schema: Schema) -> TableSchema:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def convert_field_schema(field: Field) -> TableFieldSchema:
        raise NotImplementedError  # TODO: translate from Java

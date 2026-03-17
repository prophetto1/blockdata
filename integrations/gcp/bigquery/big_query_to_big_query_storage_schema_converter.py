from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.bigquery.models.field import Field
from engine.core.docs.schema import Schema


@dataclass(slots=True, kw_only=True)
class BigQueryToBigQueryStorageSchemaConverter:
    b_q__t_a_b_l_e__s_c_h_e_m_a__m_o_d_e__m_a_p: ImmutableMap[Field, TableFieldSchema] | None = None
    b_q__t_a_b_l_e__s_c_h_e_m_a__t_y_p_e__m_a_p: ImmutableMap[StandardSQLTypeName, TableFieldSchema] | None = None

    def convert_table_schema(self, schema: Schema) -> TableSchema:
        raise NotImplementedError  # TODO: translate from Java

    def convert_field_schema(self, field: Field) -> TableFieldSchema:
        raise NotImplementedError  # TODO: translate from Java

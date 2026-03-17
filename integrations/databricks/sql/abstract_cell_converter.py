from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.kubernetes.models.connection import Connection
from integrations.databricks.sql.parameter_type import ParameterType


@dataclass(slots=True, kw_only=True)
class AbstractCellConverter:
    zone_id: ZoneId | None = None
    s_i_m_p_l_e__t_y_p_e_s: list[Class[Any]] | None = None

    def convert_cell(self, column_index: int, rs: ResultSet, connection: Connection) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def convert(self, column_index: int, rs: ResultSet) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def add_prepared_statement_value(self, ps: PreparedStatement, parameter_type: ParameterType, value: Any, index: int, connection: Connection) -> PreparedStatement:
        raise NotImplementedError  # TODO: translate from Java

    def parse_duration(self, value: Any) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def add_prepared_statement_exception(self, parameter_type: ParameterType, index: int, value: Any, e: Throwable) -> Exception:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-databricks\src\main\java\io\kestra\plugin\databricks\sql\AbstractCellConverter.java
# WARNING: Unresolved types: Class, Exception, PreparedStatement, ResultSet, SQLException, Throwable, ZoneId

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, ClassVar

from integrations.kubernetes.models.connection import Connection
from integrations.databricks.sql.parameter_type import ParameterType


@dataclass(slots=True, kw_only=True)
class AbstractCellConverter(ABC):
    s_i_m_p_l_e__t_y_p_e_s: ClassVar[list[Class[Any]]] = ImmutableList.of(
        String.class,
        Boolean.class,
        Integer.class,
        Short.class,
        Long.class,
        Float.class,
        Double.class,
        BigDecimal.class,
        byte[].class
    )
    zone_id: ZoneId | None = None

    @abstractmethod
    def convert_cell(self, column_index: int, rs: ResultSet, connection: Connection) -> Any:
        ...

    def convert(self, column_index: int, rs: ResultSet) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def add_prepared_statement_value(self, ps: PreparedStatement, parameter_type: ParameterType, value: Any, index: int, connection: Connection) -> PreparedStatement:
        raise NotImplementedError  # TODO: translate from Java

    def parse_duration(self, value: Any) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def add_prepared_statement_exception(self, parameter_type: ParameterType, index: int, value: Any, e: Throwable) -> Exception:
        raise NotImplementedError  # TODO: translate from Java

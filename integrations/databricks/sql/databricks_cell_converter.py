from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-databricks\src\main\java\io\kestra\plugin\databricks\sql\DatabricksCellConverter.java
# WARNING: Unresolved types: ResultSet, SQLException, ZoneId

from dataclasses import dataclass
from typing import Any

from integrations.databricks.sql.abstract_cell_converter import AbstractCellConverter
from integrations.kubernetes.models.connection import Connection


@dataclass(slots=True, kw_only=True)
class DatabricksCellConverter(AbstractCellConverter):

    def convert_cell(self, column_index: int, rs: ResultSet, connection: Connection) -> Any:
        raise NotImplementedError  # TODO: translate from Java

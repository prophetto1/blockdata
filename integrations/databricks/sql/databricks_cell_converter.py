from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.databricks.sql.abstract_cell_converter import AbstractCellConverter
from integrations.kubernetes.models.connection import Connection


@dataclass(slots=True, kw_only=True)
class DatabricksCellConverter(AbstractCellConverter):

    def convert_cell(self, column_index: int, rs: ResultSet, connection: Connection) -> Any:
        raise NotImplementedError  # TODO: translate from Java

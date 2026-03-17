from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresRepositoryUtils.java
# WARNING: Unresolved types: Date, Field, GroupType

from dataclasses import dataclass
from typing import Any

from engine.core.utils.date_utils import DateUtils


@dataclass(slots=True, kw_only=True)
class PostgresRepositoryUtils:

    @staticmethod
    def format_date_field(date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        raise NotImplementedError  # TODO: translate from Java

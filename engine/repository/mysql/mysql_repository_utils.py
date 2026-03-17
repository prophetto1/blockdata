from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\repository\mysql\MysqlRepositoryUtils.java
# WARNING: Unresolved types: Date, Field, GroupType

from dataclasses import dataclass
from typing import Any

from engine.core.utils.date_utils import DateUtils


@dataclass(slots=True, kw_only=True)
class MysqlRepositoryUtils:

    @staticmethod
    def format_date_field(date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\repository\h2\H2RepositoryUtils.java

from dataclasses import dataclass
from typing import Any

from engine.core.utils.date_utils import DateUtils


@dataclass(slots=True, kw_only=True)
class H2RepositoryUtils:

    @staticmethod
    def format_date_field(date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        raise NotImplementedError  # TODO: translate from Java

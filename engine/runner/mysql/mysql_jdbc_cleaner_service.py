from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\runner\mysql\MysqlJdbcCleanerService.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.jdbc_cleaner_service import JdbcCleanerService


@dataclass(slots=True, kw_only=True)
class MysqlJdbcCleanerService:

    def build_type_condition(self, type: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

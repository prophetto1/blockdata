from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\runner\postgres\PostgresJdbcCleanerService.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.conditions.condition import Condition
from engine.jdbc.runner.jdbc_cleaner_service import JdbcCleanerService


@dataclass(slots=True, kw_only=True)
class PostgresJdbcCleanerService:

    def build_type_condition(self, type: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

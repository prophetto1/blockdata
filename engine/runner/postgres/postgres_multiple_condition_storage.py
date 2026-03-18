from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\runner\postgres\PostgresMultipleConditionStorage.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_multiple_condition_storage import AbstractJdbcMultipleConditionStorage
from engine.core.models.triggers.multipleflows.multiple_condition_window import MultipleConditionWindow
from engine.repository.postgres.postgres_repository import PostgresRepository


@dataclass(slots=True, kw_only=True)
class PostgresMultipleConditionStorage(AbstractJdbcMultipleConditionStorage):
    pass

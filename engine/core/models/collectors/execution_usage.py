from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\collectors\ExecutionUsage.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.executions.statistics.daily_execution_statistics import DailyExecutionStatistics
from engine.core.repositories.execution_repository_interface import ExecutionRepositoryInterface


@dataclass(slots=True, kw_only=True)
class ExecutionUsage:
    daily_executions_count: list[DailyExecutionStatistics] | None = None

    @staticmethod
    def of(tenant_id: str, execution_repository: ExecutionRepositoryInterface, from: datetime, to: datetime) -> ExecutionUsage:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(repository: ExecutionRepositoryInterface, from: datetime, to: datetime) -> ExecutionUsage:
        raise NotImplementedError  # TODO: translate from Java

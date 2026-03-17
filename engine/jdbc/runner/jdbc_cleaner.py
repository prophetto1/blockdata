from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\JdbcCleaner.java
# WARNING: Unresolved types: Field, Record, Temporal, TypeConfiguration, jooq, org

from dataclasses import dataclass, field
from logging import logging
from datetime import timedelta
from typing import Any, ClassVar

from engine.core.models.conditions.condition import Condition
from engine.jdbc.runner.jdbc_cleaner_service import JdbcCleanerService
from engine.jdbc.jdbc_table_config import JdbcTableConfig
from engine.jdbc.jooq_dsl_context_wrapper import JooqDSLContextWrapper
from engine.plugin.core.dashboard.chart.table import Table


@dataclass(slots=True, kw_only=True)
class JdbcCleaner:
    updated_field: ClassVar[Field[Any]]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    mysql_batch_size: ClassVar[int] = 10_000
    dsl_context_wrapper: JooqDSLContextWrapper | None = None
    configuration: Configuration | None = None
    jdbc_cleaner_service: JdbcCleanerService | None = None
    queue_table: Table[Record] | None = None

    def delete_queue(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, configuration: org.jooq.Configuration, condition: Condition) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def period(self, configuration: org.jooq.Configuration, retention: timedelta) -> Temporal:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Configuration:
        retention: timedelta | None = None
        types: list[TypeConfiguration] | None = None

        @dataclass(slots=True)
        class TypeConfiguration:
            type: str | None = None
            retention: timedelta | None = None

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.singer.targets.abstract_python_target import AbstractPythonTarget
from engine.core.models.tasks.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DatamillCoPostgres(AbstractPythonTarget, RunnableTask):
    """Load data into a PostgreSQL database with a Singer target. """
    host: str
    username: str
    password: Property[str] | None = None
    db_name: Property[str] | None = None
    port: Property[int]
    schema: Property[str] | None = None
    ssl_mode: Property[str] | None = None
    invalid_records_detect: Property[bool] | None = None
    invalid_records_threshold: Property[int] | None = None
    logging_level: Property[str] | None = None
    persist_empty_tables: Property[bool] | None = None
    max_batch_rows: Property[int] | None = None
    max_buffer_size: Property[int] | None = None
    batch_detection_threshold: Property[int] | None = None
    add_upsert_indexes: Property[bool] | None = None
    before_run_sql: Property[str] | None = None
    after_run_sql: Property[str] | None = None

    def configuration(self, run_context: RunContext) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[String]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

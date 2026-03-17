from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.singer.taps.abstract_python_tap import AbstractPythonTap
from integrations.singer.models.feature import Feature
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class PipelinewisePostgres(AbstractPythonTap, RunnableTask):
    """Fetch data from a PostgreSQL database with a Singer tap."""
    host: str
    username: str
    password: Property[str] | None = None
    db_name: Property[str] | None = None
    port: Property[int]
    ssl: Property[bool] | None = None
    logical_poll_seconds: Property[int] | None = None
    break_at_end_lsn: Property[bool] | None = None
    max_run_seconds: Property[int] | None = None
    debug_lsn: Property[bool] | None = None
    filter_schemas: Property[list[String]] | None = None

    def features(self) -> list[Feature]:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[String]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

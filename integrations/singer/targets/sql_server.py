from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.singer.targets.abstract_python_target import AbstractPythonTarget
from engine.core.models.tasks.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class SqlServer(AbstractPythonTarget, RunnableTask):
    """Load data into a Microsoft SQL Server database with a Singer target."""
    host: str | None = None
    database: str | None = None
    port: Property[int]
    username: str | None = None
    password: str | None = None
    default_target_schema: Property[str] | None = None
    table_prefix: Property[str] | None = None
    prefer_float_over_numeric: Property[bool] | None = None
    stream_maps: Property[str] | None = None
    stream_map_config: Property[str] | None = None
    flattening_enabled: Property[bool] | None = None
    flattening_max_depth: Property[int] | None = None

    def configuration(self, run_context: RunContext) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[String]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

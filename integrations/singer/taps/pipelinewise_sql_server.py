from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.singer.taps.abstract_python_tap import AbstractPythonTap
from integrations.singer.models.feature import Feature
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class PipelinewiseSqlServer(AbstractPythonTap, RunnableTask):
    """Fetch data from a Microsoft SQL Server database with a Singer tap."""
    host: str | None = None
    database: str | None = None
    port: Property[int]
    username: str | None = None
    password: str | None = None
    filter_dbs: Property[list[String]] | None = None
    use_date_datatype: Property[bool]
    tds_version: Property[str] | None = None
    character_set: Property[str] | None = None
    use_singer_decimal: Property[bool] | None = None
    cursor_array_size: Property[int] | None = None

    def features(self) -> list[Feature]:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[String]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

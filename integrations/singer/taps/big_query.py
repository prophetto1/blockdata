from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.singer.taps.abstract_python_tap import AbstractPythonTap
from integrations.singer.models.feature import Feature
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class BigQuery(AbstractPythonTap, RunnableTask):
    """Fetch data from BigQuery with a Singer tap."""
    service_account: Property[str] | None = None
    streams: list[Stream]
    limit: Property[int]
    start_always_inclusive: Property[bool]
    start_date_time: datetime
    end_date_time: datetime | None = None

    def features(self) -> list[Feature]:
        raise NotImplementedError  # TODO: translate from Java

    def configuration(self, run_context: RunContext) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def pip_packages(self) -> Property[list[String]]:
        raise NotImplementedError  # TODO: translate from Java

    def command(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def environment_variables(self, run_context: RunContext) -> dict[String, String]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Stream:
        name: str | None = None
        table: str | None = None
        columns: list[String] | None = None
        datetime_key: str | None = None
        filters: list[String] | None = None


@dataclass(slots=True, kw_only=True)
class Stream:
    name: str | None = None
    table: str | None = None
    columns: list[String] | None = None
    datetime_key: str | None = None
    filters: list[String] | None = None

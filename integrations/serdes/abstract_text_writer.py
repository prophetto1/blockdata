from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTextWriter(Task):
    date_format: str = "yyyy-MM-dd"
    time_format: str = "HH:mm:ss[XXX]"
    date_time_format: str = "yyyy-MM-dd'T'HH:mm:ss.SSS[XXX]"
    time_zone_id: Property[str] | None = None
    date_formatter: DateTimeFormatter | None = None
    time_formatter: DateTimeFormatter | None = None
    date_time_formatter: DateTimeFormatter | None = None
    zone_id: ZoneId | None = None

    def init(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def convert(self, value: Any) -> str:
        raise NotImplementedError  # TODO: translate from Java

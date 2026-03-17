from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\AbstractTextWriter.java
# WARNING: Unresolved types: DateTimeFormatter, ZoneId

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTextWriter(ABC, Task):
    date_format: str = "yyyy-MM-dd"
    time_format: str = "HH:mm:ss[XXX]"
    date_time_format: str = "yyyy-MM-dd'T'HH:mm:ss.SSS[XXX]"
    time_zone_id: Property[str] = Property.ofValue(ZoneId.systemDefault().toString())
    date_formatter: DateTimeFormatter | None = None
    time_formatter: DateTimeFormatter | None = None
    date_time_formatter: DateTimeFormatter | None = None
    zone_id: ZoneId | None = None

    def init(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def convert(self, value: Any) -> str:
        raise NotImplementedError  # TODO: translate from Java

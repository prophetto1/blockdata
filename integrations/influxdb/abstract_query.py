from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-influxdb\src\main\java\io\kestra\plugin\influxdb\AbstractQuery.java
# WARNING: Unresolved types: Exception, IOException, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractQuery(ABC, AbstractTask):
    query: Property[str]
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.NONE)

    def store_results(self, run_context: RunContext, results: list[dict[str, Any]]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def handle_fetch_type(self, run_context: RunContext, all_results: list[dict[str, Any]]) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        size: int | None = None
        total: int | None = None
        rows: list[dict[str, Any]] | None = None
        row: dict[str, Any] | None = None
        uri: str | None = None

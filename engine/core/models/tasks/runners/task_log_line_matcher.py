from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\runners\TaskLogLineMatcher.java
# WARNING: Unresolved types: IOException, Level, Logger, ObjectMapper, Pattern

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar, Optional

from engine.core.models.executions.abstract_metric_entry import AbstractMetricEntry
from engine.core.runners.asset_emit import AssetEmit
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class TaskLogLineMatcher:
    log_data_syntax: ClassVar[Pattern]
    mapper: ClassVar[ObjectMapper]

    def matches(self, log_line: str, logger: Logger, run_context: RunContext, instant: datetime) -> Optional[TaskLogMatch]:
        raise NotImplementedError  # TODO: translate from Java

    def handle(self, logger: Logger, run_context: RunContext, instant: datetime, match: TaskLogMatch, data: str) -> TaskLogMatch:
        raise NotImplementedError  # TODO: translate from Java

    def matches(self, log_line: str) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TaskLogMatch:
        outputs: dict[str, Any] | None = None
        metrics: list[AbstractMetricEntry[Any]] | None = None
        logs: list[LogLine] | None = None
        assets: AssetEmit | None = None

        def outputs(self) -> dict[str, Any]:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class LogLine:
        level: Level | None = None
        message: str | None = None

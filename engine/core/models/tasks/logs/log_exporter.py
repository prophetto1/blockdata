from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\logs\LogExporter.java
# WARNING: Unresolved types: Exception, Flux, T, core, io, kestra, models

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.logs.log_record import LogRecord
from engine.core.models.tasks.output import Output
from engine.core.models.annotations.plugin import Plugin
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class LogExporter:
    id: str
    type: str

    def send_logs(self, run_context: RunContext, log_records: Flux[LogRecord]) -> T:
        raise NotImplementedError  # TODO: translate from Java

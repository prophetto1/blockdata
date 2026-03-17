from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\logs\LogExporter.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.logs.log_record import LogRecord
from engine.core.models.tasks.output import Output
from engine.core.models.annotations.plugin import Plugin
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class LogExporter(ABC):
    id: str
    type: str

    @abstractmethod
    def send_logs(self, run_context: RunContext, log_records: Flux[LogRecord]) -> T:
        ...

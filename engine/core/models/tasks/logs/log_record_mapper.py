from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\logs\LogRecordMapper.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.executions.log_entry import LogEntry
from engine.core.models.tasks.logs.log_record import LogRecord


@dataclass(slots=True, kw_only=True)
class LogRecordMapper:

    @staticmethod
    def map_to_log_record(log: LogEntry) -> LogRecord:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def map_to_log_record(log: LogEntry, max_message_size: int) -> LogRecord:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def instant_in_nanos(instant: datetime) -> int:
        raise NotImplementedError  # TODO: translate from Java

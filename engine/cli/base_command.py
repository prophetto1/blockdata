from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\BaseCommand.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any


@dataclass(slots=True, kw_only=True)
class BaseCommand(ABC):
    verbose: list[bool]
    log_level: LogLevel = LogLevel.INFO
    internal_log: bool = False

    def init_logger(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def message(message: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def std_out(message: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def std_err(message: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    class LogLevel(str, Enum):
        TRACE = "TRACE"
        DEBUG = "DEBUG"
        INFO = "INFO"
        WARN = "WARN"
        ERROR = "ERROR"

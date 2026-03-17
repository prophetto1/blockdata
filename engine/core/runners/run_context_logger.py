from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\RunContextLogger.java
# WARNING: Unresolved types: AppenderBase, ILoggingEvent, IOException, Level, Logger, OutputStream, PatternLayout, Supplier, Throwable, ch, classic, event, logback, org, qos, slf4j

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

from engine.core.models.executions.log_entry import LogEntry
from engine.core.queues.queue_interface import QueueInterface


@dataclass(slots=True, kw_only=True)
class RunContextLogger:
    max_message_length: ClassVar[int] = 1024 * 15
    original_timestamp_key: ClassVar[str] = "originalTimestamp"
    use_secrets: list[str] = field(default_factory=list)
    logger_name: str | None = None
    logger: Logger | None = None
    log_queue: QueueInterface[LogEntry] | None = None
    log_entry: LogEntry | None = None
    loglevel: Level | None = None
    log_to_file: bool | None = None
    log_file: Path | None = None
    log_file_os: OutputStream | None = None

    def base_logger_name(self, log_entry: LogEntry) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log_entry(event: ILoggingEvent, message: str, level: org.slf4j.event.Level, log_entry: LogEntry) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log_entries(event: ILoggingEvent, log_entry: LogEntry) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def throwable(event: ILoggingEvent) -> Throwable:
        raise NotImplementedError  # TODO: translate from Java

    def used_secret(self, secret: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def logger(self) -> org.slf4j.Logger:
        raise NotImplementedError  # TODO: translate from Java

    def initialize_logger(self) -> Logger:
        raise NotImplementedError  # TODO: translate from Java

    def reset_mdc(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get(self) -> org.slf4j.Logger:
        raise NotImplementedError  # TODO: translate from Java

    def close_log_file(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class BaseAppender(ABC, AppenderBase):
        logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
        run_context_logger: RunContextLogger | None = None
        logger: Logger | None = None

        def replace_secret(self, data: str) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def recursive(self, object: Any) -> Any:
            raise NotImplementedError  # TODO: translate from Java

        def replace_secret(self, data: list[Any]) -> list[Any]:
            raise NotImplementedError  # TODO: translate from Java

        def transform(self, event: ILoggingEvent) -> ILoggingEvent:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ContextAppender(BaseAppender):
        logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
        log_queue: QueueInterface[LogEntry] | None = None
        log_entry: LogEntry | None = None

        def append(self, e: ILoggingEvent) -> None:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class FileAppender(BaseAppender):
        logger: ClassVar[ch.qos.logback.classic.Logger]
        pattern_layout: ClassVar[PatternLayout]
        file_os: OutputStream | None = None

        def append(self, e: ILoggingEvent) -> None:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ForwardAppender(BaseAppender):
        foward_logger: ch.qos.logback.classic.Logger | None = None

        def start(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def stop(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def append(self, e: ILoggingEvent) -> None:
            raise NotImplementedError  # TODO: translate from Java

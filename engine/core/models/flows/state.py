from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\State.java

from dataclasses import dataclass, field
from enum import Enum
from logging import logging
from datetime import datetime
from datetime import timedelta
from typing import Any, ClassVar, Optional

from engine.core.models.tasks.task import Task


@dataclass(frozen=True, slots=True, kw_only=True)
class State:
    current: Type
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    histories: list[History] | None = None

    @staticmethod
    def of(state: Type, histories: list[History]) -> State:
        raise NotImplementedError  # TODO: translate from Java

    def with_state(self, state: Type) -> State:
        raise NotImplementedError  # TODO: translate from Java

    def reset(self) -> State:
        raise NotImplementedError  # TODO: translate from Java

    def get_duration(self) -> Optional[timedelta]:
        raise NotImplementedError  # TODO: translate from Java

    def get_duration_or_compute_it(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def get_start_date(self) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def get_end_date(self) -> Optional[datetime]:
        raise NotImplementedError  # TODO: translate from Java

    def human_duration(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def max_date(self) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def min_date(self) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def is_terminated(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def can_be_restarted(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def can_change_status(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_terminated_no_fail(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_running(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_created(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def running_types() -> list[Type]:
        raise NotImplementedError  # TODO: translate from Java

    def is_failed(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_paused(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_breakpoint(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_queued(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_retrying(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_success(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_restartable(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_resumable(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_resuming_after_pause(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def failed_then_restarted(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    class Type(str, Enum):
        CREATED = "CREATED"
        SUBMITTED = "SUBMITTED"
        RUNNING = "RUNNING"
        PAUSED = "PAUSED"
        RESTARTED = "RESTARTED"
        KILLING = "KILLING"
        SUCCESS = "SUCCESS"
        WARNING = "WARNING"
        FAILED = "FAILED"
        KILLED = "KILLED"
        CANCELLED = "CANCELLED"
        QUEUED = "QUEUED"
        RETRYING = "RETRYING"
        RETRIED = "RETRIED"
        SKIPPED = "SKIPPED"
        BREAKPOINT = "BREAKPOINT"
        RESUBMITTED = "RESUBMITTED"

    @dataclass(slots=True)
    class History:
        state: Type
        date: datetime

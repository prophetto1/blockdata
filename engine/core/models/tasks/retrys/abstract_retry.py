from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\retrys\AbstractRetry.java
# WARNING: Unresolved types: RetryPolicyBuilder, T

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from datetime import timedelta
from typing import Any

from engine.core.models.tasks.retrys.constant import Constant
from engine.core.models.tasks.retrys.exponential import Exponential
from engine.core.models.tasks.retrys.random import Random


@dataclass(slots=True, kw_only=True)
class AbstractRetry(ABC):
    warning_on_retry: bool = False
    behavior: Behavior = Behavior.RETRY_FAILED_TASK
    max_duration: timedelta | None = None
    max_attempts: int | None = None

    @abstractmethod
    def get_type(self) -> str:
        ...

    def get_max_attempt(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def next_retry_date(self, attempt_count: int, last_attempt: datetime) -> datetime:
        ...

    def to_policy(self) -> RetryPolicyBuilder[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def retry_policy(retry: AbstractRetry) -> RetryPolicyBuilder[T]:
        raise NotImplementedError  # TODO: translate from Java

    class Behavior(str, Enum):
        RETRY_FAILED_TASK = "RETRY_FAILED_TASK"
        CREATE_NEW_EXECUTION = "CREATE_NEW_EXECUTION"

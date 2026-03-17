from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\retrys\Random.java
# WARNING: Unresolved types: RetryPolicyBuilder

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from engine.core.models.tasks.retrys.abstract_retry import AbstractRetry


@dataclass(slots=True, kw_only=True)
class Random(AbstractRetry):
    min_interval: timedelta
    max_interval: timedelta
    type: str = "random"

    def to_policy(self) -> RetryPolicyBuilder[T]:
        raise NotImplementedError  # TODO: translate from Java

    def next_retry_date(self, attempt_count: int, last_attempt: datetime) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

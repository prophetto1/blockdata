from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\models\AttemptFailureReason.java

from dataclasses import dataclass
from typing import Any

from integrations.airbyte.models.attempt_failure_origin import AttemptFailureOrigin
from integrations.airbyte.models.attempt_failure_type import AttemptFailureType


@dataclass(slots=True, kw_only=True)
class AttemptFailureReason:
    failure_origin: AttemptFailureOrigin | None = None
    failure_type: AttemptFailureType | None = None
    external_message: str | None = None
    internal_message: str | None = None
    stacktrace: str | None = None
    retryable: bool | None = None
    timestamp: int | None = None

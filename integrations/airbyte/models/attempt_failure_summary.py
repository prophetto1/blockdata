from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\models\AttemptFailureSummary.java

from dataclasses import dataclass
from typing import Any

from integrations.airbyte.models.attempt_failure_reason import AttemptFailureReason


@dataclass(slots=True, kw_only=True)
class AttemptFailureSummary:
    failures: list[AttemptFailureReason] | None = None
    partial_success: bool | None = None

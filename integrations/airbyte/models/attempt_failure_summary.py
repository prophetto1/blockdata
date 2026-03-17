from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.airbyte.models.attempt_failure_reason import AttemptFailureReason


@dataclass(slots=True, kw_only=True)
class AttemptFailureSummary:
    failures: list[AttemptFailureReason] | None = None
    partial_success: bool | None = None

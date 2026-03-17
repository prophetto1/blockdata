from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.airbyte.models.attempt import Attempt
from engine.plugin.core.log.log import Log


@dataclass(slots=True, kw_only=True)
class AttemptInfo:
    attempt: Attempt | None = None
    logs: Log | None = None
    log_type: str | None = None

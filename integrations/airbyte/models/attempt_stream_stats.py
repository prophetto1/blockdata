from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.airbyte.models.attempt_stats import AttemptStats


@dataclass(slots=True, kw_only=True)
class AttemptStreamStats:
    stream_name: str | None = None
    stats: AttemptStats | None = None

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\models\AttemptStreamStats.java

from dataclasses import dataclass
from typing import Any

from integrations.airbyte.models.attempt_stats import AttemptStats


@dataclass(slots=True, kw_only=True)
class AttemptStreamStats:
    stream_name: str | None = None
    stats: AttemptStats | None = None

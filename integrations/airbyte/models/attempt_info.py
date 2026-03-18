from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\models\AttemptInfo.java

from dataclasses import dataclass
from typing import Any

from integrations.airbyte.models.attempt import Attempt
from integrations.airbyte.models.log import Log


@dataclass(slots=True, kw_only=True)
class AttemptInfo:
    attempt: Attempt | None = None
    logs: Log | None = None
    log_type: str | None = None

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\models\JobInfo.java

from dataclasses import dataclass
from typing import Any

from integrations.airbyte.models.attempt_info import AttemptInfo
from integrations.airbyte.models.job import Job


@dataclass(slots=True, kw_only=True)
class JobInfo:
    job: Job | None = None
    attempts: list[AttemptInfo] | None = None

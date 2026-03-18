from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cloud\models\JobStatusHumanizedEnum.java

from enum import Enum
from typing import Any


class JobStatusHumanizedEnum(str, Enum):
    QUEUED = "QUEUED"
    STARTING = "STARTING"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    ERROR = "ERROR"
    CANCELLED = "CANCELLED"

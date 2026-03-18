from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hightouch\src\main\java\io\kestra\plugin\hightouch\models\RunStatus.java

from enum import Enum
from typing import Any


class RunStatus(str, Enum):
    PROCESSING = "PROCESSING"
    QUEUED = "QUEUED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    SUCCESS = "SUCCESS"
    QUERYING = "QUERYING"
    WARNING = "WARNING"
    REPORTING = "REPORTING"
    INTERRUPTED = "INTERRUPTED"
    COMPLETED_WITH_ERRORS = "COMPLETED_WITH_ERRORS"

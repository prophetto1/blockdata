from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\actor\ActorJobStatus.java

from enum import Enum
from typing import Any


class ActorJobStatus(str, Enum):
    READY = "READY"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    TIMING_OUT = "TIMING_OUT"
    TIMED_OUT = "TIMED_OUT"
    ABORTING = "ABORTING"
    ABORTED = "ABORTED"

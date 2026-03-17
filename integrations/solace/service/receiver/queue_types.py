from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-solace\src\main\java\io\kestra\plugin\solace\service\receiver\QueueTypes.java
# WARNING: Unresolved types: Queue

from enum import Enum
from typing import Any


class QueueTypes(str, Enum):
    DURABLE_EXCLUSIVE = "DURABLE_EXCLUSIVE"
    DURABLE_NON_EXCLUSIVE = "DURABLE_NON_EXCLUSIVE"
    NON_DURABLE_EXCLUSIVE = "NON_DURABLE_EXCLUSIVE"

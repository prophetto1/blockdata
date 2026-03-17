from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\queues\QueueException.java
# WARNING: Unresolved types: Exception, Throwable

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class QueueException(Exception):
    serial_version_u_i_d: int = 2

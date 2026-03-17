from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\queues\QueueException.java
# WARNING: Unresolved types: Exception, Throwable

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class QueueException(Exception):
    serial_version_uid: ClassVar[int] = 2

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\queues\UnsupportedMessageException.java
# WARNING: Unresolved types: Throwable

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.queues.queue_exception import QueueException


@dataclass(slots=True, kw_only=True)
class UnsupportedMessageException(QueueException):
    serial_version_uid: ClassVar[int] = 1

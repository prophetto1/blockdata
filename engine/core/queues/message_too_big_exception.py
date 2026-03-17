from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\queues\MessageTooBigException.java

from dataclasses import dataclass
from typing import Any

from engine.core.queues.queue_exception import QueueException


@dataclass(slots=True, kw_only=True)
class MessageTooBigException(QueueException):
    serial_version_u_i_d: int = 1

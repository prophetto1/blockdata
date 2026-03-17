from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\TimeoutExceededException.java

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class TimeoutExceededException(Exception):
    serial_version_uid: ClassVar[int] = 1

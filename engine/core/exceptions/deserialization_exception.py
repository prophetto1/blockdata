from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\DeserializationException.java

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class DeserializationException(RuntimeException):
    serial_version_uid: ClassVar[int] = 1
    record: str | None = None

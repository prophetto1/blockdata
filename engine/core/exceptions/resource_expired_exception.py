from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\ResourceExpiredException.java

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class ResourceExpiredException(Exception):
    serial_version_uid: ClassVar[int] = 1

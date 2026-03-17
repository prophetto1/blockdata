from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\ResourceExpiredException.java
# WARNING: Unresolved types: Exception, Throwable

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ResourceExpiredException(Exception):
    serial_version_u_i_d: int = 1

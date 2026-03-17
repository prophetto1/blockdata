from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\MigrationRequiredException.java
# WARNING: Unresolved types: RuntimeException

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class MigrationRequiredException(RuntimeException):
    serial_version_u_i_d: int = 1

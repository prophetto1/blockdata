from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\KestraRuntimeException.java
# WARNING: Unresolved types: RuntimeException, Throwable

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class KestraRuntimeException(RuntimeException):
    serial_version_u_i_d: ClassVar[int] = 1

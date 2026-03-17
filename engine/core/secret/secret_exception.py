from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\secret\SecretException.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.kestra_runtime_exception import KestraRuntimeException


@dataclass(slots=True, kw_only=True)
class SecretException(KestraRuntimeException):
    serial_version_u_i_d: ClassVar[int] = 1

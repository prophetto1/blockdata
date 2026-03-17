from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\FlowProcessingException.java
# WARNING: Unresolved types: Throwable

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.kestra_exception import KestraException


@dataclass(slots=True, kw_only=True)
class FlowProcessingException(KestraException):
    serial_version_u_i_d: int = 1

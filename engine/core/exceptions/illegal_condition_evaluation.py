from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\IllegalConditionEvaluation.java
# WARNING: Unresolved types: Throwable

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.internal_exception import InternalException


@dataclass(slots=True, kw_only=True)
class IllegalConditionEvaluation(InternalException):
    serial_version_u_i_d: int = 1

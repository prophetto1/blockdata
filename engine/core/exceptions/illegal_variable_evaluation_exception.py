from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\IllegalVariableEvaluationException.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.internal_exception import InternalException


@dataclass(slots=True, kw_only=True)
class IllegalVariableEvaluationException(InternalException):
    serial_version_uid: ClassVar[int] = 1

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\NotFoundException.java

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.kestra_runtime_exception import KestraRuntimeException


@dataclass(slots=True, kw_only=True)
class NotFoundException(KestraRuntimeException):
    pass

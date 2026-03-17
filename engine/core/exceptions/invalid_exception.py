from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\InvalidException.java

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.kestra_runtime_exception import KestraRuntimeException


@dataclass(slots=True, kw_only=True)
class InvalidException(KestraRuntimeException):
    serial_version_u_i_d: int = 1
    invalid: Any | None = None

    def invalid_object(self) -> Any:
        raise NotImplementedError  # TODO: translate from Java

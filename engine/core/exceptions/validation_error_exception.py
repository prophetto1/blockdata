from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\ValidationErrorException.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.kestra_runtime_exception import KestraRuntimeException


@dataclass(slots=True, kw_only=True)
class ValidationErrorException(KestraRuntimeException):
    serial_version_uid: ClassVar[int] = 1
    validation_error_message: ClassVar[str] = "Resource fails validation"
    invalids: list[str] | None = None

    def formated_invalid_objects(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

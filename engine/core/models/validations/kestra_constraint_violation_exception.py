from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\validations\KestraConstraintViolationException.java
# WARNING: Unresolved types: ConstraintViolation

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class KestraConstraintViolationException(ConstraintViolationException):
    serial_version_uid: ClassVar[int] = 1

    def get_message(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def replace_id(self, type: str, error_message: str, task_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

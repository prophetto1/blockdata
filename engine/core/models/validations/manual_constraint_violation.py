from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\validations\ManualConstraintViolation.java
# WARNING: Unresolved types: ConstraintDescriptor, ConstraintViolation

from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(slots=True, kw_only=True)
class ManualConstraintViolation:
    message: str | None = None
    root_bean: T | None = None
    root_bean_class: type[T] | None = None
    leaf_bean: Any | None = None
    property_path: Path | None = None
    invalid_value: Any | None = None

    @staticmethod
    def of(message: str, object: T, cls: type[T], property_path: str, invalid_value: Any) -> ManualConstraintViolation[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_constraint_violation_exception(message: str, object: T | None = None, cls: type[T] | None = None, property_path: str | None = None, invalid_value: Any | None = None) -> ValueError:
        raise NotImplementedError  # TODO: translate from Java

    def get_message_template(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_executable_parameters(self) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_executable_return_value(self) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_constraint_descriptor(self) -> ConstraintDescriptor[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def unwrap(self, type: type[C]) -> C:
        raise NotImplementedError  # TODO: translate from Java

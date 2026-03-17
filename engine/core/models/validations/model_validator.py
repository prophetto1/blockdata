from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\validations\ModelValidator.java
# WARNING: Unresolved types: ConstraintViolationException, T, Validator

from dataclasses import dataclass
from typing import Any, Optional


@dataclass(slots=True, kw_only=True)
class ModelValidator:
    validator: Validator | None = None

    def validate(self, model: T) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def is_valid(self, model: T) -> Optional[ConstraintViolationException]:
        raise NotImplementedError  # TODO: translate from Java

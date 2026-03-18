from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\TimezoneIdValidator.java

from dataclasses import dataclass
from typing import Any

from engine.core.validations.timezone_id import TimezoneId


@dataclass(slots=True, kw_only=True)
class TimezoneIdValidator:

    def is_valid(self, value: str, annotation_metadata: AnnotationValue[TimezoneId], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

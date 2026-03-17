from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\DateFormatValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from engine.core.validations.date_format import DateFormat


@dataclass(slots=True, kw_only=True)
class DateFormatValidator:

    def is_valid(self, value: str, annotation_metadata: AnnotationValue[DateFormat], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\TimeWindowValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from engine.core.models.triggers.time_window import TimeWindow
from engine.core.validations.time_window_validation import TimeWindowValidation


@dataclass(slots=True, kw_only=True)
class TimeWindowValidator:

    def is_valid(self, value: TimeWindow, annotation_metadata: AnnotationValue[TimeWindowValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\ScheduleValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.trigger.schedule import Schedule
from engine.core.validations.schedule_validation import ScheduleValidation


@dataclass(slots=True, kw_only=True)
class ScheduleValidator:

    def is_valid(self, value: Schedule, annotation_metadata: AnnotationValue[ScheduleValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

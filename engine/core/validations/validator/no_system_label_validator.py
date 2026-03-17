from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\NoSystemLabelValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from engine.core.models.label import Label
from engine.core.validations.no_system_label_validation import NoSystemLabelValidation


@dataclass(slots=True, kw_only=True)
class NoSystemLabelValidator:

    def is_valid(self, value: Label, annotation_metadata: AnnotationValue[NoSystemLabelValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

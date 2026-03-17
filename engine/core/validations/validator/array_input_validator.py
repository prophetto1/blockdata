from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\ArrayInputValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.input.array_input import ArrayInput
from engine.core.validations.array_input_validation import ArrayInputValidation


@dataclass(slots=True, kw_only=True)
class ArrayInputValidator:

    def is_valid(self, value: ArrayInput, annotation_metadata: AnnotationValue[ArrayInputValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

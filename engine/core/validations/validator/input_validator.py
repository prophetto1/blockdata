from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\InputValidator.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.input import Input
from engine.core.validations.input_validation import InputValidation
from engine.core.runners.variable_renderer import VariableRenderer


@dataclass(slots=True, kw_only=True)
class InputValidator:
    variable_renderer: VariableRenderer | None = None

    def is_valid(self, value: Input[Any], annotation_metadata: AnnotationValue[InputValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\FileInputValidator.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.input.file_input import FileInput
from engine.core.validations.file_input_validation import FileInputValidation
from engine.core.runners.variable_renderer import VariableRenderer


@dataclass(slots=True, kw_only=True)
class FileInputValidator:
    variable_renderer: VariableRenderer | None = None

    def is_valid(self, value: FileInput, annotation_metadata: AnnotationValue[FileInputValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

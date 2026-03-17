from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\WorkingDirectoryTaskValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.flow.working_directory import WorkingDirectory
from engine.core.validations.working_directory_task_validation import WorkingDirectoryTaskValidation


@dataclass(slots=True, kw_only=True)
class WorkingDirectoryTaskValidator:

    def is_valid(self, value: WorkingDirectory, annotation_metadata: AnnotationValue[WorkingDirectoryTaskValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

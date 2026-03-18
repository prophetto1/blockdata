from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\FilesVersionBehaviorValidator.java

from dataclasses import dataclass
from typing import Any

from engine.core.validations.files_version_behavior_validation import FilesVersionBehaviorValidation
from engine.plugin.core.namespace.version import Version


@dataclass(slots=True, kw_only=True)
class FilesVersionBehaviorValidator:

    def is_valid(self, value: Version, annotation_metadata: AnnotationValue[FilesVersionBehaviorValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

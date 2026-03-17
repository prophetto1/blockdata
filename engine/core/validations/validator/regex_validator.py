from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\RegexValidator.java

from dataclasses import dataclass
from typing import Any

from engine.core.validations.regex import Regex


@dataclass(slots=True, kw_only=True)
class RegexValidator:

    def is_valid(self, value: str, annotation_metadata: AnnotationValue[Regex], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\JsonStringValidator.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.validations.json_string import JsonString


@dataclass(slots=True, kw_only=True)
class JsonStringValidator:
    object_mapper: ClassVar[ObjectMapper]

    def is_valid(self, value: str, annotation_metadata: AnnotationValue[JsonString], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

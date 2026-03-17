from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\JsonStringValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext, ObjectMapper

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.validations.json_string import JsonString


@dataclass(slots=True, kw_only=True)
class JsonStringValidator:
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = new ObjectMapper()

    def is_valid(self, value: str, annotation_metadata: AnnotationValue[JsonString], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

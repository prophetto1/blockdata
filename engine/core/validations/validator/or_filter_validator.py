from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\OrFilterValidator.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.filters.or import Or
from engine.core.validations.or_filter_validation import OrFilterValidation


@dataclass(slots=True, kw_only=True)
class OrFilterValidator:

    def is_valid(self, or_filter: Or[Any], annotation_metadata: AnnotationValue[OrFilterValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

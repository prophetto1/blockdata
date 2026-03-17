from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\PreconditionFilterValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext, Filter

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.trigger.flow import Flow
from engine.core.validations.precondition_filter_validation import PreconditionFilterValidation


@dataclass(slots=True, kw_only=True)
class PreconditionFilterValidator:

    def is_valid(self, value: Flow.Filter, annotation_metadata: AnnotationValue[PreconditionFilterValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

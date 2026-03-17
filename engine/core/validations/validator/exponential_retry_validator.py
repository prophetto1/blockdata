from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\ExponentialRetryValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.retrys.exponential import Exponential
from engine.core.validations.exponential_retry_validation import ExponentialRetryValidation


@dataclass(slots=True, kw_only=True)
class ExponentialRetryValidator:

    def is_valid(self, value: Exponential, annotation_metadata: AnnotationValue[ExponentialRetryValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

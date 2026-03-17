from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\RandomRetryValidator.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.retrys.random import Random
from engine.core.validations.random_retry_validation import RandomRetryValidation


@dataclass(slots=True, kw_only=True)
class RandomRetryValidator:

    def is_valid(self, value: Random, annotation_metadata: AnnotationValue[RandomRetryValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\ConstantRetryValidator.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.retrys.constant import Constant
from engine.core.validations.constant_retry_validation import ConstantRetryValidation


@dataclass(slots=True, kw_only=True)
class ConstantRetryValidator:

    def is_valid(self, value: Constant, annotation_metadata: AnnotationValue[ConstantRetryValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

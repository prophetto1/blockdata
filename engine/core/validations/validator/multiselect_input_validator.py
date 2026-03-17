from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\MultiselectInputValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.input.multiselect_input import MultiselectInput
from engine.core.validations.multiselect_input_validation import MultiselectInputValidation


@dataclass(slots=True, kw_only=True)
class MultiselectInputValidator:

    def is_valid(self, value: MultiselectInput, annotation_metadata: AnnotationValue[MultiselectInputValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

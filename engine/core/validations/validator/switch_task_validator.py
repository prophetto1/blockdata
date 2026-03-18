from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\SwitchTaskValidator.java

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.flow.switch import Switch
from engine.core.validations.switch_task_validation import SwitchTaskValidation


@dataclass(slots=True, kw_only=True)
class SwitchTaskValidator:

    def is_valid(self, value: Switch, annotation_metadata: AnnotationValue[SwitchTaskValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

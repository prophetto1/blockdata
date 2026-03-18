from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\ExecutionsDataFilterValidator.java

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.dashboard.data.executions import Executions
from engine.core.validations.executions_data_filter_validation import ExecutionsDataFilterValidation


@dataclass(slots=True, kw_only=True)
class ExecutionsDataFilterValidator:

    def is_valid(self, executions_data_filter: Executions[Any], annotation_metadata: AnnotationValue[ExecutionsDataFilterValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

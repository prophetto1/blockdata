from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\ExecutionsDataFilterKPIValidator.java

from dataclasses import dataclass
from typing import Any

from engine.core.validations.executions_data_filter_validation import ExecutionsDataFilterValidation
from engine.plugin.core.dashboard.data.executions_kpi import ExecutionsKPI


@dataclass(slots=True, kw_only=True)
class ExecutionsDataFilterKPIValidator:

    def is_valid(self, executions_data_filter: ExecutionsKPI[Any], annotation_metadata: AnnotationValue[ExecutionsDataFilterValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

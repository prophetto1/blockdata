from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\DataChartValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.charts.data_chart import DataChart
from engine.core.validations.data_chart_validation import DataChartValidation


@dataclass(slots=True, kw_only=True)
class DataChartValidator:
    repository_type: str | None = None

    def is_valid(self, data_chart: DataChart[Any, Any], annotation_metadata: AnnotationValue[DataChartValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

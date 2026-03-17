from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\DataChartKPIValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from engine.core.models.dashboards.charts.data_chart_k_p_i import DataChartKPI
from engine.core.validations.data_chart_k_p_i_validation import DataChartKPIValidation


@dataclass(slots=True, kw_only=True)
class DataChartKPIValidator:
    repository_type: str | None = None

    def is_valid(self, data_chart: DataChartKPI[Any, Any], annotation_metadata: AnnotationValue[DataChartKPIValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

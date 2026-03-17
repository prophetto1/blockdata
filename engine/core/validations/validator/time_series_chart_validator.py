from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\TimeSeriesChartValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.dashboard.chart.time_series import TimeSeries
from engine.core.validations.time_series_chart_validation import TimeSeriesChartValidation


@dataclass(slots=True, kw_only=True)
class TimeSeriesChartValidator:

    def is_valid(self, time_series_chart: TimeSeries[Any, Any], annotation_metadata: AnnotationValue[TimeSeriesChartValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

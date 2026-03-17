from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\TableChartValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.dashboard.chart.table import Table
from engine.core.validations.table_chart_validation import TableChartValidation


@dataclass(slots=True, kw_only=True)
class TableChartValidator:

    def is_valid(self, table_chart: Table[Any, Any], annotation_metadata: AnnotationValue[TableChartValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

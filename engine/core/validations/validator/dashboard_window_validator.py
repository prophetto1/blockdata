from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\DashboardWindowValidator.java

from dataclasses import dataclass
from typing import Any

from engine.core.validations.dashboard_window_validation import DashboardWindowValidation
from engine.core.models.dashboards.time_window import TimeWindow


@dataclass(slots=True, kw_only=True)
class DashboardWindowValidator:

    def is_valid(self, value: TimeWindow, annotation_metadata: AnnotationValue[DashboardWindowValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

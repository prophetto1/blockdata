from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\input\DateInput.java
# WARNING: Unresolved types: ConstraintViolationException

from dataclasses import dataclass
from datetime import date
from typing import Any

from engine.core.models.flows.input import Input


@dataclass(slots=True, kw_only=True)
class DateInput(Input):
    after: date | None = None
    before: date | None = None

    def validate(self, input: date) -> None:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\input\DateTimeInput.java
# WARNING: Unresolved types: ConstraintViolationException

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.flows.input import Input


@dataclass(slots=True, kw_only=True)
class DateTimeInput(Input):
    after: datetime | None = None
    before: datetime | None = None

    def validate(self, input: datetime) -> None:
        raise NotImplementedError  # TODO: translate from Java

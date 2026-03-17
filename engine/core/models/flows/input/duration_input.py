from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\input\DurationInput.java

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.models.flows.input import Input


@dataclass(slots=True, kw_only=True)
class DurationInput(Input):
    min: timedelta | None = None
    max: timedelta | None = None

    def validate(self, input: timedelta) -> None:
        raise NotImplementedError  # TODO: translate from Java

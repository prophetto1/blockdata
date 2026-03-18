from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\input\FloatInput.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.input import Input


@dataclass(slots=True, kw_only=True)
class FloatInput(Input):
    min: float | None = None
    max: float | None = None

    def validate(self, input: float) -> None:
        raise NotImplementedError  # TODO: translate from Java

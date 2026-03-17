from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\input\IntInput.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.input import Input


@dataclass(slots=True, kw_only=True)
class IntInput(Input):
    min: int | None = None
    max: int | None = None

    def validate(self, input: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

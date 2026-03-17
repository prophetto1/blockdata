from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\input\TimeInput.java

from dataclasses import dataclass
from datetime import time
from typing import Any

from engine.core.models.flows.input import Input


@dataclass(slots=True, kw_only=True)
class TimeInput(Input):
    after: time | None = None
    before: time | None = None

    def validate(self, input: time) -> None:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\input\BoolInput.java
# WARNING: Unresolved types: ConstraintViolationException

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.input import Input


@dataclass(slots=True, kw_only=True)
class BoolInput(Input):

    def validate(self, input: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

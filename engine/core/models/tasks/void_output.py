from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\VoidOutput.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.output import Output


@dataclass(slots=True, kw_only=True)
class VoidOutput:
    pass

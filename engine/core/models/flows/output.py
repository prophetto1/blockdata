from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\Output.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.data import Data
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class Output:
    id: str
    value: Any
    type: Type
    description: str | None = None
    display_name: str | None = None
    required: bool | None = None

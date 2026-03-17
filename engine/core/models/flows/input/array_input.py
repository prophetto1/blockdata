from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\input\ArrayInput.java
# WARNING: Unresolved types: ConstraintViolationException

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.input import Input
from engine.core.models.flows.input.item_type_interface import ItemTypeInterface
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class ArrayInput(Input):
    item_type: Type

    def validate(self, input: list[Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

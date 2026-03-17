from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\input\SelectInput.java
# WARNING: Unresolved types: ConstraintViolationException, Function

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.input import Input
from engine.core.models.property.property import Property
from engine.core.models.flows.renderable_input import RenderableInput


@dataclass(slots=True, kw_only=True)
class SelectInput(Input):
    allow_custom_value: bool = False
    is_radio: bool = False
    auto_select_first: bool = False
    values: list[@Regex String] | None = None
    expression: str | None = None

    def get_defaults(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def validate(self, input: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, renderer: Function[str, Any]) -> Input[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def render_expression_values(self, renderer: Function[str, Any]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\input\MultiselectInput.java

from dataclasses import dataclass
from typing import Any, Callable

from engine.core.models.flows.input import Input
from engine.core.models.flows.input.item_type_interface import ItemTypeInterface
from engine.core.models.flows.renderable_input import RenderableInput
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class MultiselectInput(Input):
    item_type: Type = Type.STRING
    allow_custom_value: bool = False
    auto_select_first: bool = False
    options: list[@Regex String] | None = None
    values: list[@Regex String] | None = None
    expression: str | None = None

    def get_defaults(self) -> Property[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def validate(self, inputs: list[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, renderer: Callable[str, Any]) -> Input[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def render_expression_values(self, renderer: Callable[str, Any]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

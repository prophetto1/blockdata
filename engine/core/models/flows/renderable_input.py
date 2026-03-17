from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\RenderableInput.java

from typing import Any, Callable, Protocol

from engine.core.models.flows.input import Input


class RenderableInput(Protocol):
    def render(self, renderer: Callable[str, Any]) -> Input[Any]: ...

    def may_render_input(input: Input[Any], renderer: Callable[str, Any]) -> Input[Any]: ...

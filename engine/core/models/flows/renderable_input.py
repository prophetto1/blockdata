from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\RenderableInput.java
# WARNING: Unresolved types: Function

from typing import Any, Protocol

from engine.core.models.flows.input import Input


class RenderableInput(Protocol):
    def render(self, renderer: Function[str, Any]) -> Input[Any]: ...

    def may_render_input(input: Input[Any], renderer: Function[str, Any]) -> Input[Any]: ...

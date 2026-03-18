from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\property\PropertyContext.java

from typing import Any, Protocol

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.variable_renderer import VariableRenderer


class PropertyContext(Protocol):
    def render(self, inline: str, variables: dict[str, Any]) -> str: ...

    def create(renderer: VariableRenderer) -> PropertyContext: ...

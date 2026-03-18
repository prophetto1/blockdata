from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\RenderingFunctionInterface.java

from typing import Any, Protocol

from engine.core.runners.variable_renderer import VariableRenderer


class RenderingFunctionInterface(Protocol):
    def function_name(self) -> str: ...

    def variable_renderer(self, application_context: ApplicationContext) -> VariableRenderer: ...

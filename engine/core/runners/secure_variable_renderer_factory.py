from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\SecureVariableRendererFactory.java
# WARNING: Unresolved types: ApplicationContext

from dataclasses import dataclass
from typing import Any

from engine.core.runners.pebble.pebble_engine_factory import PebbleEngineFactory
from engine.core.runners.variable_renderer import VariableRenderer


@dataclass(slots=True, kw_only=True)
class SecureVariableRendererFactory:
    pebble_engine_factory: PebbleEngineFactory | None = None
    application_context: ApplicationContext | None = None
    secure_variable_renderer: VariableRenderer | None = None

    def create_or_get(self) -> VariableRenderer:
        raise NotImplementedError  # TODO: translate from Java

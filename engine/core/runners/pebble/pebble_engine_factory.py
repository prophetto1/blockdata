from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\PebbleEngineFactory.java
# WARNING: Unresolved types: ApplicationContext, Builder, Class, Function, MeterRegistry, PebbleEngine, Syntax, VariableConfiguration

from dataclasses import dataclass
from typing import Any

from engine.core.runners.pebble.extension import Extension
from engine.core.runners.variable_renderer import VariableRenderer


@dataclass(slots=True, kw_only=True)
class PebbleEngineFactory:
    application_context: ApplicationContext | None = None
    variable_configuration: VariableRenderer.VariableConfiguration | None = None
    meter_registry: MeterRegistry | None = None

    def create(self) -> PebbleEngine:
        raise NotImplementedError  # TODO: translate from Java

    def create_with_custom_syntax(self, syntax: Syntax, extension: Class[Any]) -> PebbleEngine:
        raise NotImplementedError  # TODO: translate from Java

    def create_with_masked_functions(self, renderer: VariableRenderer, functions_to_mask: list[str]) -> PebbleEngine:
        raise NotImplementedError  # TODO: translate from Java

    def new_pebble_engine_builder(self) -> PebbleEngine.Builder:
        raise NotImplementedError  # TODO: translate from Java

    def extension_with_masked_functions(self, renderer: VariableRenderer, initial_extension: Extension, masked_functions: list[str]) -> Extension:
        raise NotImplementedError  # TODO: translate from Java

    def variable_renderer_proxy(self, renderer: VariableRenderer, initial_function: Function) -> Function:
        raise NotImplementedError  # TODO: translate from Java

    def masked_function_proxy(self, initial_function: Function) -> Function:
        raise NotImplementedError  # TODO: translate from Java

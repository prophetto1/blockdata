from __future__ import annotations

# Source: E:\KESTRA\tests\src\main\java\io\kestra\core\junit\extensions\FlowExecutorExtension.java
# WARNING: Unresolved types: AfterEachCallback, ApplicationContext, ExtensionContext, ParameterContext, ParameterResolutionException, ParameterResolver, URISyntaxException

from dataclasses import dataclass
from typing import Any

from engine.core.junit.annotations.execute_flow import ExecuteFlow


@dataclass(slots=True, kw_only=True)
class FlowExecutorExtension:
    context: ApplicationContext | None = None

    def supports_parameter(self, parameter_context: ParameterContext, extension_context: ExtensionContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_parameter(self, parameter_context: ParameterContext, extension_context: ExtensionContext) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def after_each(self, extension_context: ExtensionContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_execute_flow(extension_context: ExtensionContext) -> ExecuteFlow:
        raise NotImplementedError  # TODO: translate from Java

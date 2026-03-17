from __future__ import annotations

# Source: E:\KESTRA\tests\src\main\java\io\kestra\core\junit\extensions\FlowLoaderWithTenantExtension.java
# WARNING: Unresolved types: AfterEachCallback, ExtensionContext, ParameterContext, ParameterResolutionException, ParameterResolver, URISyntaxException

from dataclasses import dataclass
from typing import Any

from engine.core.junit.extensions.abstract_flow_loader_extension import AbstractFlowLoaderExtension
from engine.core.junit.annotations.load_flows_with_tenant import LoadFlowsWithTenant


@dataclass(slots=True, kw_only=True)
class FlowLoaderWithTenantExtension(AbstractFlowLoaderExtension):
    tenant_id: str = TestsUtils.randomTenant()

    def supports_parameter(self, parameter_context: ParameterContext, extension_context: ExtensionContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_parameter(self, parameter_context: ParameterContext, extension_context: ExtensionContext) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def after_each(self, extension_context: ExtensionContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_load_flows(extension_context: ExtensionContext) -> LoadFlowsWithTenant:
        raise NotImplementedError  # TODO: translate from Java

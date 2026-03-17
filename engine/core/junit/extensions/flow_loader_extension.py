from __future__ import annotations

# Source: E:\KESTRA\tests\src\main\java\io\kestra\core\junit\extensions\FlowLoaderExtension.java
# WARNING: Unresolved types: AfterEachCallback, BeforeEachCallback, ExtensionContext, URISyntaxException

from dataclasses import dataclass
from typing import Any

from engine.core.junit.extensions.abstract_flow_loader_extension import AbstractFlowLoaderExtension
from engine.core.junit.annotations.load_flows import LoadFlows


@dataclass(slots=True, kw_only=True)
class FlowLoaderExtension(AbstractFlowLoaderExtension):

    def before_each(self, extension_context: ExtensionContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def after_each(self, extension_context: ExtensionContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_load_flows(extension_context: ExtensionContext) -> LoadFlows:
        raise NotImplementedError  # TODO: translate from Java

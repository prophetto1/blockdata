from __future__ import annotations

# Source: E:\KESTRA\tests\src\main\java\io\kestra\core\junit\extensions\AbstractFlowLoaderExtension.java
# WARNING: Unresolved types: ApplicationContext, ExtensionContext, IOException, URISyntaxException

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class AbstractFlowLoaderExtension:
    application_context: ApplicationContext | None = None

    def load_flows(self, extension_context: ExtensionContext, tenant_id: str, paths: list[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_flows(self, tenant_id: str, paths: list[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

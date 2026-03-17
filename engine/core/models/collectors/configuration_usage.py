from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\collectors\ConfigurationUsage.java
# WARNING: Unresolved types: ApplicationContext

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ConfigurationUsage:
    repository_type: str | None = None
    queue_type: str | None = None
    storage_type: str | None = None
    secret_type: str | None = None
    java_security_enabled: bool | None = None

    @staticmethod
    def of(tenant_id: str, application_context: ApplicationContext) -> ConfigurationUsage:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(application_context: ApplicationContext) -> ConfigurationUsage:
        raise NotImplementedError  # TODO: translate from Java

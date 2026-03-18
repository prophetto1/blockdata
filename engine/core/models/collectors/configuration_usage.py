from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\collectors\ConfigurationUsage.java

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
    def of(tenant_id: str, application_context: ApplicationContext | None = None) -> ConfigurationUsage:
        raise NotImplementedError  # TODO: translate from Java

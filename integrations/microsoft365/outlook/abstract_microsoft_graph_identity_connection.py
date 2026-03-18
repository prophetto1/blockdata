from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\outlook\AbstractMicrosoftGraphIdentityConnection.java
# WARNING: Unresolved types: Exception, GraphServiceClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractMicrosoftGraphIdentityConnection(ABC, Task):
    tenant_id: Property[str]
    client_id: Property[str]
    client_secret: Property[str]
    scopes: Property[str] = Property.ofValue("https://graph.microsoft.com/.default")
    user_principal_name: Property[str] | None = None

    def create_graph_client(self, run_context: RunContext) -> GraphServiceClient:
        raise NotImplementedError  # TODO: translate from Java

    def get_user_principal_name(self, run_context: RunContext) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

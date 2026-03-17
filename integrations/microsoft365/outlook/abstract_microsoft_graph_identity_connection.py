from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractMicrosoftGraphIdentityConnection(Task):
    tenant_id: Property[str]
    client_id: Property[str]
    client_secret: Property[str]
    user_principal_name: Property[str] | None = None
    scopes: Property[str] | None = None

    def create_graph_client(self, run_context: RunContext) -> GraphServiceClient:
        raise NotImplementedError  # TODO: translate from Java

    def get_user_principal_name(self, run_context: RunContext) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java

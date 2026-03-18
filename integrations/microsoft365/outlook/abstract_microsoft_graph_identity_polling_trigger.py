from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\outlook\AbstractMicrosoftGraphIdentityPollingTrigger.java
# WARNING: Unresolved types: Exception, GraphServiceClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractMicrosoftGraphIdentityPollingTrigger(ABC, AbstractTrigger):
    tenant_id: Property[str]
    client_id: Property[str]
    client_secret: Property[str]
    scopes: Property[str] = Property.ofValue("https://graph.microsoft.com/.default")
    interval: timedelta = Duration.ofMinutes(5)
    user_principal_name: Property[str] | None = None

    def create_graph_client(self, run_context: RunContext) -> GraphServiceClient:
        raise NotImplementedError  # TODO: translate from Java

    def get_user_principal_name(self, run_context: RunContext) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_interval(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

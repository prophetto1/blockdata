from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractMicrosoftGraphIdentityPollingTrigger(AbstractTrigger, PollingTriggerInterface):
    tenant_id: Property[str]
    client_id: Property[str]
    client_secret: Property[str]
    user_principal_name: Property[str] | None = None
    scopes: Property[str] | None = None
    interval: timedelta | None = None

    def create_graph_client(self, run_context: RunContext) -> GraphServiceClient:
        raise NotImplementedError  # TODO: translate from Java

    def get_user_principal_name(self, run_context: RunContext) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java

    def get_interval(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

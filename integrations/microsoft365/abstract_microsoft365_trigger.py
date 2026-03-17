from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from integrations.microsoft365.microsoft_graph_connection_interface import MicrosoftGraphConnectionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractMicrosoft365Trigger(AbstractTrigger, MicrosoftGraphConnectionInterface):
    tenant_id: Property[str] | None = None
    client_id: Property[str] | None = None
    client_secret: Property[str] | None = None
    pem_certificate: Property[str] | None = None

    def graph_client(self, run_context: RunContext) -> GraphServiceClient:
        raise NotImplementedError  # TODO: translate from Java

    def credentials(self, run_context: RunContext) -> TokenCredential:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\AbstractMicrosoft365Trigger.java
# WARNING: Unresolved types: GraphServiceClient, TokenCredential

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.microsoft365.microsoft_graph_connection_interface import MicrosoftGraphConnectionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractMicrosoft365Trigger(ABC, AbstractTrigger):
    tenant_id: Property[str] | None = None
    client_id: Property[str] | None = None
    client_secret: Property[str] | None = None
    pem_certificate: Property[str] | None = None

    def graph_client(self, run_context: RunContext) -> GraphServiceClient:
        raise NotImplementedError  # TODO: translate from Java

    def credentials(self, run_context: RunContext) -> TokenCredential:
        raise NotImplementedError  # TODO: translate from Java

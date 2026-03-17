from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\config\EventHubClientConfig.java
# WARNING: Unresolved types: T

from dataclasses import dataclass
from typing import Any, Optional

from integrations.azure.client.azure_client_config import AzureClientConfig
from integrations.azure.eventhubs.event_hub_client_interface import EventHubClientInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class EventHubClientConfig(AzureClientConfig):

    def event_hub_name(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def client_max_retries(self) -> Optional[int]:
        raise NotImplementedError  # TODO: translate from Java

    def client_retry_delay(self) -> Optional[int]:
        raise NotImplementedError  # TODO: translate from Java

    def namespace(self) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def custom_endpoint_address(self) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

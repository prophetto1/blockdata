from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\EventHubClientInterface.java

from typing import Any, Protocol

from integrations.azure.azure_client_with_sas_interface import AzureClientWithSasInterface
from engine.core.models.property.property import Property


class EventHubClientInterface(AzureClientWithSasInterface, Protocol):
    def get_custom_endpoint_address(self) -> Property[str]: ...

    def get_namespace(self) -> Property[str]: ...

    def get_event_hub_name(self) -> Property[str]: ...

    def get_client_max_retries(self) -> Property[int]: ...

    def get_client_retry_delay(self) -> Property[int]: ...

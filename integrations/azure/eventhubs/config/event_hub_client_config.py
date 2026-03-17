from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.client.azure_client_config import AzureClientConfig


@dataclass(slots=True, kw_only=True)
class EventHubClientConfig(AzureClientConfig):

    def event_hub_name(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def client_max_retries(self) -> Optional[Integer]:
        raise NotImplementedError  # TODO: translate from Java

    def client_retry_delay(self) -> Optional[Long]:
        raise NotImplementedError  # TODO: translate from Java

    def namespace(self) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java

    def custom_endpoint_address(self) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java

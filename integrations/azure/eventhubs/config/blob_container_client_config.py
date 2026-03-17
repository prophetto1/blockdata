from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.client.azure_client_config import AzureClientConfig
from integrations.azure.eventhubs.blob_container_client_interface import BlobContainerClientInterface


@dataclass(slots=True, kw_only=True)
class BlobContainerClientConfig(AzureClientConfig):

    def container_name(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

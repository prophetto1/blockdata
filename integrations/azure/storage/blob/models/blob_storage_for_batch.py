from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.abstract_connection_interface import AbstractConnectionInterface
from integrations.azure.azure_client_interface import AzureClientInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class BlobStorageForBatch(AzureClientInterface, AbstractConnectionInterface):
    endpoint: Property[str] | None = None
    connection_string: Property[str] | None = None
    shared_key_account_name: Property[str] | None = None
    shared_key_account_access_key: Property[str] | None = None
    container_name: Property[str]

    def valid(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def blob_container_client(self, run_context: RunContext) -> BlobContainerClient:
        raise NotImplementedError  # TODO: translate from Java

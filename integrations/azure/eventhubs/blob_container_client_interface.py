from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.azure_client_with_sas_interface import AzureClientWithSasInterface
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class BlobContainerClientInterface(AzureClientWithSasInterface):
    connection_string: Property[str] | None = None
    shared_key_account_name: Property[str] | None = None
    shared_key_account_access_key: Property[str] | None = None
    sas_token: Property[str] | None = None
    container_name: Property[str] | None = None

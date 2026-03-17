from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.abstracts.abstract_storage import AbstractStorage
from integrations.azure.azure_client_with_sas_interface import AzureClientWithSasInterface
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractStorageWithSas(AbstractStorage, AzureClientWithSasInterface):
    sas_token: Property[str] | None = None

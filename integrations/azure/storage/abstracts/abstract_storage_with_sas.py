from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\abstracts\AbstractStorageWithSas.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.abstracts.abstract_storage import AbstractStorage
from integrations.azure.azure_client_with_sas_interface import AzureClientWithSasInterface
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractStorageWithSas(ABC, AbstractStorage):
    sas_token: Property[str] | None = None

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\abstracts\AbstractStorage.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.aws.abstract_connection import AbstractConnection
from integrations.azure.azure_client_interface import AzureClientInterface
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractStorage(ABC, AbstractConnection):
    connection_string: Property[str] | None = None
    shared_key_account_name: Property[str] | None = None
    shared_key_account_access_key: Property[str] | None = None

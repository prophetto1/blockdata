from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kubernetes.abstract_connection import AbstractConnection
from integrations.azure.azure_client_interface import AzureClientInterface
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractStorage(AbstractConnection, AzureClientInterface):
    connection_string: Property[str] | None = None
    shared_key_account_name: Property[str] | None = None
    shared_key_account_access_key: Property[str] | None = None

from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property


class AzureClientInterface(Protocol):
    def get_connection_string(self) -> Property[str]: ...
    def get_shared_key_account_name(self) -> Property[str]: ...
    def get_shared_key_account_access_key(self) -> Property[str]: ...

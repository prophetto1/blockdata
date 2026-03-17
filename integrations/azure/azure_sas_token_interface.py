from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property


class AzureSasTokenInterface(Protocol):
    def get_sas_token(self) -> Property[str]: ...

from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property


class AbstractBatchInterface(Protocol):
    def get_account(self) -> Property[str]: ...
    def get_access_key(self) -> Property[str]: ...

from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property


class As400ConnectionInterface(Protocol):
    def get_host(self) -> Property[str]: ...
    def get_user(self) -> Property[str]: ...
    def get_password(self) -> Property[str]: ...

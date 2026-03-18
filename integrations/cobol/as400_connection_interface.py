from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cobol\src\main\java\io\kestra\plugin\cobol\As400ConnectionInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class As400ConnectionInterface(Protocol):
    def get_host(self) -> Property[str]: ...

    def get_user(self) -> Property[str]: ...

    def get_password(self) -> Property[str]: ...

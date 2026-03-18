from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\AbstractConnectionInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class AbstractConnectionInterface(Protocol):
    def get_endpoint(self) -> Property[str]: ...

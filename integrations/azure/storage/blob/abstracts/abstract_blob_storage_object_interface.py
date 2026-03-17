from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\blob\abstracts\AbstractBlobStorageObjectInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class AbstractBlobStorageObjectInterface(Protocol):
    def get_container(self) -> Property[str]: ...

    def get_name(self) -> Property[str]: ...

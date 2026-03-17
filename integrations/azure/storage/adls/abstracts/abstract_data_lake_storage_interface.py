from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\adls\abstracts\AbstractDataLakeStorageInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class AbstractDataLakeStorageInterface(Protocol):
    def get_file_system(self) -> Property[str]: ...

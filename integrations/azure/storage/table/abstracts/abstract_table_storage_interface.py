from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\table\abstracts\AbstractTableStorageInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class AbstractTableStorageInterface(Protocol):
    def get_table(self) -> Property[str]: ...

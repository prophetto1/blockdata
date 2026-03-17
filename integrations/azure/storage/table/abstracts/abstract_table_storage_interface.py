from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property


class AbstractTableStorageInterface(Protocol):
    def get_table(self) -> Property[str]: ...

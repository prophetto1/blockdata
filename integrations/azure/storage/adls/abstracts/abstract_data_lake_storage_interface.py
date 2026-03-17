from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property


class AbstractDataLakeStorageInterface(Protocol):
    def get_file_system(self) -> Property[str]: ...

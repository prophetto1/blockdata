from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\StorageSplitInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class StorageSplitInterface(Protocol):
    def get_bytes(self) -> Property[str]: ...

    def get_partitions(self) -> Property[int]: ...

    def get_rows(self) -> Property[int]: ...

    def get_separator(self) -> Property[str]: ...

    def get_regex_pattern(self) -> Property[str]: ...

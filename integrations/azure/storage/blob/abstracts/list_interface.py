from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\blob\abstracts\ListInterface.java

from enum import Enum
from typing import Any, Protocol

from engine.core.models.property.property import Property


class ListInterface(Protocol):
    def get_prefix(self) -> Property[str]: ...

    def get_regexp(self) -> Property[str]: ...

    def get_delimiter(self) -> Property[str]: ...

    def get_filter(self) -> Property[Filter]: ...

from __future__ import annotations

from enum import Enum
from typing import Any, Protocol

from engine.core.models.property.property import Property


class Filter(str, Enum):
    FILES = "FILES"
    DIRECTORY = "DIRECTORY"
    BOTH = "BOTH"


class ListInterface(Protocol):
    def get_prefix(self) -> Property[str]: ...
    def get_regexp(self) -> Property[str]: ...
    def get_delimiter(self) -> Property[str]: ...
    def get_filter(self) -> Property[Filter]: ...

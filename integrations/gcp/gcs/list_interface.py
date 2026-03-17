from __future__ import annotations

from enum import Enum
from typing import Any, Protocol

from engine.core.models.property.property import Property


class Filter(str, Enum):
    FILES = "FILES"
    DIRECTORY = "DIRECTORY"
    BOTH = "BOTH"


class ListingType(str, Enum):
    RECURSIVE = "RECURSIVE"
    DIRECTORY = "DIRECTORY"


class ListInterface(Protocol):
    def get_from(self) -> Property[str]: ...
    def get_listing_type(self) -> Property[list]: ...
    def get_reg_exp(self) -> Property[str]: ...

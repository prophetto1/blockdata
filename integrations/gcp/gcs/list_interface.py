from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\ListInterface.java

from enum import Enum
from typing import Any, Protocol

from engine.core.models.property.property import Property


class ListInterface(Protocol):
    def get_from(self) -> Property[str]: ...

    def get_listing_type(self) -> Property[List.ListingType]: ...

    def get_reg_exp(self) -> Property[str]: ...

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-stripe\src\main\java\io\kestra\plugin\stripe\StripeInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class StripeInterface(Protocol):
    def get_api_key(self) -> Property[str]: ...

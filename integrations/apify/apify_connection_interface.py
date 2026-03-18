from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\ApifyConnectionInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class ApifyConnectionInterface(Protocol):
    def get_api_token(self) -> Property[str]: ...

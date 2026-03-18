from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meilisearch\src\main\java\io\kestra\plugin\meilisearch\MeilisearchConnectionInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class MeilisearchConnectionInterface(Protocol):
    def get_url(self) -> Property[str]: ...

    def get_key(self) -> Property[str]: ...

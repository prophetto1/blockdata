from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-neo4j\src\main\java\io\kestra\plugin\neo4j\Neo4jConnectionInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class Neo4jConnectionInterface(Protocol):
    def get_url(self) -> Property[str]: ...

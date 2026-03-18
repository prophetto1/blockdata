from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-surrealdb\src\main\java\io\kestra\plugin\surrealdb\QueryInterface.java

from typing import Any, Protocol

from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property


class QueryInterface(Protocol):
    def get_fetch_type(self) -> Property[FetchType]: ...

    def get_parameters(self) -> Property[dict[str, str]]: ...

    def get_query(self) -> str: ...

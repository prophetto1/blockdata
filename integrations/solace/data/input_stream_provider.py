from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-solace\src\main\java\io\kestra\plugin\solace\data\InputStreamProvider.java
# WARNING: Unresolved types: IOException, InputStream

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class InputStreamProvider:
    context: RunContext | None = None

    def get(self, path: str) -> InputStream:
        raise NotImplementedError  # TODO: translate from Java

    def get(self, objects: list[Any]) -> InputStream:
        raise NotImplementedError  # TODO: translate from Java

    def get(self, object: dict[str, Any]) -> InputStream:
        raise NotImplementedError  # TODO: translate from Java

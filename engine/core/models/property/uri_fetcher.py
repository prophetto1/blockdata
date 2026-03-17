from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\property\URIFetcher.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class URIFetcher:
    supported_schemes: ClassVar[list[str]]
    uri: str | None = None

    @staticmethod
    def of(uri: str) -> URIFetcher:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def supports(uri: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def fetch(self, run_context: RunContext) -> Any:
        raise NotImplementedError  # TODO: translate from Java

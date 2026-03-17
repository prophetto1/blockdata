from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\responses\PagedResults.java

from dataclasses import dataclass
from typing import Any

from engine.core.repositories.array_list_total import ArrayListTotal


@dataclass(slots=True, kw_only=True)
class PagedResults:
    results: list[T]
    total: int

    @staticmethod
    def of(results: ArrayListTotal[T]) -> PagedResults[T]:
        raise NotImplementedError  # TODO: translate from Java

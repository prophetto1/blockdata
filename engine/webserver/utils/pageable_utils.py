from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\PageableUtils.java
# WARNING: Unresolved types: Sort

from dataclasses import dataclass
from typing import Any, Callable


@dataclass(slots=True, kw_only=True)
class PageableUtils:

    @staticmethod
    def from(page: int, size: int, sort: list[str] | None = None, sort_mapper: Callable[str, str] | None = None) -> Pageable:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def sort(sort: list[str], sort_mapper: Callable[str, str]) -> Sort:
        raise NotImplementedError  # TODO: translate from Java

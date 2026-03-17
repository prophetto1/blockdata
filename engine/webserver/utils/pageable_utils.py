from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\PageableUtils.java
# WARNING: Unresolved types: Function, HttpStatusException, Pageable, Sort

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class PageableUtils:

    @staticmethod
    def from(page: int, size: int, sort: list[str], sort_mapper: Function[str, str]) -> Pageable:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from(page: int, size: int, sort: list[str]) -> Pageable:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from(page: int, size: int) -> Pageable:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def sort(sort: list[str], sort_mapper: Function[str, str]) -> Sort:
        raise NotImplementedError  # TODO: translate from Java

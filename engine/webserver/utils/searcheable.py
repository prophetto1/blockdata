from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\Searcheable.java
# WARNING: Unresolved types: Builder, Comparable, Function, T, U

from dataclasses import dataclass, field
from typing import Any

from engine.core.repositories.array_list_total import ArrayListTotal


@dataclass(slots=True, kw_only=True)
class Searcheable:
    items: list[T] | None = None

    @staticmethod
    def of(items: list[T]) -> Searcheable[T]:
        raise NotImplementedError  # TODO: translate from Java

    def search(self, searched: Searched[T]) -> ArrayListTotal[T]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Searched:
        page: int | None = None
        size: int | None = None
        sort: list[str] | None = None
        query: str | None = None
        searchable_extractors: dict[str, Function[Any, Any]] | None = None
        sortable_extractors: dict[str, Function[Any, Comparable[Any]]] | None = None

        @staticmethod
        def builder() -> Builder[T]:
            raise NotImplementedError  # TODO: translate from Java

        @dataclass(slots=True)
        class Builder:
            page: int = 1
            size: int = 100
            sort: list[str] = List.of()
            searchable_extractors: dict[str, Function[Any, Any]] = field(default_factory=dict)
            sortable_extractors: dict[str, Function[Any, Comparable[Any]]] = field(default_factory=dict)
            query: str | None = None

            def page(self, page: int) -> Builder[T]:
                raise NotImplementedError  # TODO: translate from Java

            def size(self, size: int) -> Builder[T]:
                raise NotImplementedError  # TODO: translate from Java

            def sort(self, sort: list[str]) -> Builder[T]:
                raise NotImplementedError  # TODO: translate from Java

            def query(self, query: str) -> Builder[T]:
                raise NotImplementedError  # TODO: translate from Java

            def searchable_extractor(self, key: str, key_extractor: Function[Any, Any]) -> Builder[T]:
                raise NotImplementedError  # TODO: translate from Java

            def sortable_extractor(self, key: str, key_extractor: Function[Any, Any]) -> Builder[T]:
                raise NotImplementedError  # TODO: translate from Java

            def build(self) -> Searched[T]:
                raise NotImplementedError  # TODO: translate from Java

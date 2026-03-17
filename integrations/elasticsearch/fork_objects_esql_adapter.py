from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.reporter.type import Type


@dataclass(slots=True, kw_only=True)
class ForkObjectsEsqlAdapter(EsqlAdapter):
    type: Type | None = None

    def of(self, clazz: Class[T]) -> ForkObjectsEsqlAdapter[T]:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, type: Type) -> ForkObjectsEsqlAdapter[T]:
        raise NotImplementedError  # TODO: translate from Java

    def format(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def columnar(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def deserialize(self, client: ApiClient[ElasticsearchTransport, Any], request: QueryRequest, response: BinaryResponse) -> Iterable[T]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_row(self, columns: list[EsqlMetadata], parser: JsonParser, mapper: JsonpMapper) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def read_header(self, parser: JsonParser, mapper: JsonpMapper) -> EsqlMetadata:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class EsqlMetadata(co):
        took: int | None = None


@dataclass(slots=True, kw_only=True)
class EsqlMetadata(co):
    took: int | None = None

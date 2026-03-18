from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-elasticsearch\src\main\java\io\kestra\plugin\elasticsearch\ForkObjectsEsqlAdapter.java
# WARNING: Unresolved types: ApiClient, BinaryResponse, Class, ElasticsearchTransport, EsqlAdapter, EsqlColumn, IOException, JsonParser, JsonpMapper, QueryRequest, T, _helpers, clients, co, elastic, elasticsearch, esql

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class ForkObjectsEsqlAdapter:
    type: Type | None = None

    @staticmethod
    def of(clazz: Class[T]) -> ForkObjectsEsqlAdapter[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(type: Type) -> ForkObjectsEsqlAdapter[T]:
        raise NotImplementedError  # TODO: translate from Java

    def format(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def columnar(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def deserialize(self, client: ApiClient[ElasticsearchTransport, Any], request: QueryRequest, response: BinaryResponse) -> list[T]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_row(self, columns: list[EsqlMetadata.EsqlColumn], parser: JsonParser, mapper: JsonpMapper) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def read_header(parser: JsonParser, mapper: JsonpMapper) -> EsqlMetadata:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class EsqlMetadata(EsqlMetadata):
        took: int | None = None

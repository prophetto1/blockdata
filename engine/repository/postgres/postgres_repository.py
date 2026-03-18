from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresRepository.java
# WARNING: Unresolved types: InsertOnDuplicateSetMoreStep, RecordMapper

from dataclasses import dataclass
from typing import Any

from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.repositories.array_list_total import ArrayListTotal
from engine.jdbc.jdbc_table_config import JdbcTableConfig
from engine.jdbc.jooq_dsl_context_wrapper import JooqDSLContextWrapper


@dataclass(slots=True, kw_only=True)
class PostgresRepository(AbstractJdbcRepository):

    def full_text_condition(self, fields: list[str], query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def persist_fields(self, entity: T) -> dict[Field[Any], Any]:
        raise NotImplementedError  # TODO: translate from Java

    def persist(self, entity: T, context: DSLContext, fields: dict[Field[Any], Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def build_insert_request(self, entity: T, fields: dict[Field[Any], Any], dsl_context: DSLContext) -> InsertOnDuplicateSetMoreStep[Record]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_page(self, context: DSLContext, select: SelectConditionStep[R], pageable: Pageable, mapper: RecordMapper[R, E]) -> ArrayListTotal[E]:
        raise NotImplementedError  # TODO: translate from Java

    def map(self, record: R) -> T:
        raise NotImplementedError  # TODO: translate from Java

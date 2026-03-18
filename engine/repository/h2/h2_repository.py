from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\repository\h2\H2Repository.java
# WARNING: Unresolved types: RecordMapper

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.repositories.array_list_total import ArrayListTotal
from engine.jdbc.jdbc_table_config import JdbcTableConfig
from engine.jdbc.jooq_dsl_context_wrapper import JooqDSLContextWrapper


@dataclass(slots=True, kw_only=True)
class H2Repository(AbstractJdbcRepository):

    def persist(self, entity: T, context: DSLContext, fields: dict[Field[Any], Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def persist_internal(self, entity: T, context: DSLContext, fields: dict[Field[Any], Any]) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def persist_batch(self, items: list[T]) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def full_text_condition(self, fields: list[str], query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_page(self, context: DSLContext, select: SelectConditionStep[R], pageable: Pageable, mapper: RecordMapper[R, E]) -> ArrayListTotal[E]:
        raise NotImplementedError  # TODO: translate from Java

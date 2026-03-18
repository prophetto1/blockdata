from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\repository\mysql\MysqlRepository.java
# WARNING: Unresolved types: RecordMapper, Select, Timestamp

from dataclasses import dataclass
from typing import Any

from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.repositories.array_list_total import ArrayListTotal
from engine.jdbc.jdbc_table_config import JdbcTableConfig
from engine.jdbc.jooq_dsl_context_wrapper import JooqDSLContextWrapper
from engine.core.queues.queue_service import QueueService


@dataclass(slots=True, kw_only=True)
class MysqlRepository(AbstractJdbcRepository):

    def full_text_condition(self, fields: list[str], query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def escape_for_like(s: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_page(self, context: DSLContext, select: SelectConditionStep[R], pageable: Pageable, mapper: RecordMapper[R, E]) -> ArrayListTotal[E]:
        raise NotImplementedError  # TODO: translate from Java

    def build_query(self, context: DSLContext, select: SelectConditionStep[R], order_field: str) -> Select[R]:
        raise NotImplementedError  # TODO: translate from Java

    def week_from_timestamp(self, timestamp_field: Field[Timestamp]) -> Field[int]:
        raise NotImplementedError  # TODO: translate from Java

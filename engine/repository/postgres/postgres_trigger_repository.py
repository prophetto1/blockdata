from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresTriggerRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_trigger_repository import AbstractJdbcTriggerRepository
from engine.core.utils.date_utils import DateUtils
from engine.jdbc.services.jdbc_filter_service import JdbcFilterService
from engine.repository.postgres.postgres_repository import PostgresRepository
from engine.core.models.triggers.trigger import Trigger


@dataclass(slots=True, kw_only=True)
class PostgresTriggerRepository(AbstractJdbcTriggerRepository):

    def format_date_field(self, date_field: str, group_type: DateUtils.GroupType) -> Field[Date]:
        raise NotImplementedError  # TODO: translate from Java

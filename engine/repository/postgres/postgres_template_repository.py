from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresTemplateRepository.java
# WARNING: Unresolved types: ApplicationContext

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_template_repository import AbstractJdbcTemplateRepository
from engine.core.models.conditions.condition import Condition
from engine.repository.postgres.postgres_repository import PostgresRepository
from engine.core.models.templates.template import Template


@dataclass(slots=True, kw_only=True)
class PostgresTemplateRepository(AbstractJdbcTemplateRepository):

    def find_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

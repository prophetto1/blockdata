from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\repository\mysql\MysqlTemplateRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_template_repository import AbstractJdbcTemplateRepository
from engine.repository.mysql.mysql_repository import MysqlRepository
from engine.core.models.templates.template import Template


@dataclass(slots=True, kw_only=True)
class MysqlTemplateRepository(AbstractJdbcTemplateRepository):

    def find_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

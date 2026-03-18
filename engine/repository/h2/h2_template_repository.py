from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\repository\h2\H2TemplateRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_template_repository import AbstractJdbcTemplateRepository
from engine.repository.h2.h2_repository import H2Repository
from engine.core.models.templates.template import Template


@dataclass(slots=True, kw_only=True)
class H2TemplateRepository(AbstractJdbcTemplateRepository):

    def find_condition(self, query: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

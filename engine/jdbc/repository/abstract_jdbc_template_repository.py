from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\repository\AbstractJdbcTemplateRepository.java
# WARNING: Unresolved types: ApplicationContext, ApplicationEventPublisher, ConstraintViolationException, Pageable, io, jdbc, kestra

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional

from engine.jdbc.repository.abstract_jdbc_crud_repository import AbstractJdbcCrudRepository
from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.repositories.array_list_total import ArrayListTotal
from engine.core.models.conditions.condition import Condition
from engine.core.events.crud_event import CrudEvent
from engine.core.queues.queue_interface import QueueInterface
from engine.core.models.templates.template import Template
from engine.core.repositories.template_repository_interface import TemplateRepositoryInterface


@dataclass(slots=True, kw_only=True)
class AbstractJdbcTemplateRepository(ABC, AbstractJdbcCrudRepository):
    template_queue: QueueInterface[Template] | None = None
    event_publisher: ApplicationEventPublisher[CrudEvent[Template]] | None = None

    def find_by_id(self, tenant_id: str, namespace: str, id: str) -> Optional[Template]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_with_no_acl(self, tenant_id: str) -> list[Template]:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def find_condition(self, query: str) -> Condition:
        ...

    def find(self, pageable: Pageable, query: str, tenant_id: str, namespace: str) -> ArrayListTotal[Template]:
        raise NotImplementedError  # TODO: translate from Java

    def find(self, query: str, tenant_id: str, namespace: str) -> list[Template]:
        raise NotImplementedError  # TODO: translate from Java

    def compute_condition(self, query: str, namespace: str) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_namespace(self, tenant_id: str, namespace: str) -> list[Template]:
        raise NotImplementedError  # TODO: translate from Java

    def create(self, template: Template) -> Template:
        raise NotImplementedError  # TODO: translate from Java

    def update(self, template: Template, previous: Template) -> Template:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, template: Template) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def find_distinct_namespace(self, tenant_id: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

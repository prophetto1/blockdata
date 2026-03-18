from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\repository\AbstractJdbcSettingRepository.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional

from engine.jdbc.repository.abstract_jdbc_crud_repository import AbstractJdbcCrudRepository
from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.events.crud_event import CrudEvent
from engine.core.models.setting import Setting
from engine.core.repositories.setting_repository_interface import SettingRepositoryInterface


@dataclass(slots=True, kw_only=True)
class AbstractJdbcSettingRepository(ABC, AbstractJdbcCrudRepository):
    event_publisher: ApplicationEventPublisher[CrudEvent[Setting]] | None = None

    def is_task_run_enabled(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_key(self, key: str) -> Optional[Setting]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all(self) -> list[Setting]:
        raise NotImplementedError  # TODO: translate from Java

    def save(self, setting: Setting) -> Setting:
        raise NotImplementedError  # TODO: translate from Java

    def internal_save(self, setting: Setting) -> Setting:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, setting: Setting) -> Setting:
        raise NotImplementedError  # TODO: translate from Java

    def default_filter(self, tenant_id: str | None = None) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

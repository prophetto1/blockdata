from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\repository\AbstractJdbcCrudRepository.java
# WARNING: Unresolved types: OrderField

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional

from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.repositories.array_list_total import ArrayListTotal


@dataclass(slots=True, kw_only=True)
class AbstractJdbcCrudRepository(ABC, AbstractJdbcRepository):
    jdbc_repository: io.kestra.jdbc.AbstractJdbcRepository[T] | None = None

    def create(self, item: T) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def save(self, context: DSLContext, item: T | None = None) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def save_batch(self, items: list[T]) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def update(self, current: T) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def find_one(self, tenant_id: str, condition: Condition, allow_deleted: bool | None = None) -> Optional[T]:
        raise NotImplementedError  # TODO: translate from Java

    def find(self, tenant_id: str, condition: Condition, allow_deleted: bool | None = None) -> list[T]:
        raise NotImplementedError  # TODO: translate from Java

    def find_async(self, tenant_id: str, condition: Condition, allow_deleted: bool | None = None) -> Flux[T]:
        raise NotImplementedError  # TODO: translate from Java

    def find_page(self, pageable: Pageable, tenant_id: str, condition: Condition, allow_deleted: bool | None = None) -> ArrayListTotal[T]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all(self, tenant_id: str) -> list[T]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_async(self, tenant_id: str) -> Flux[T]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all_for_all_tenants(self) -> list[T]:
        raise NotImplementedError  # TODO: translate from Java

    def count(self, tenant_id: str, condition: Condition) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def count_all(self, tenant_id: str) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def count_all_for_all_tenants(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

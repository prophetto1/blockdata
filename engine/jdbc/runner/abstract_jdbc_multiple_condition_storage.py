from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\AbstractJdbcMultipleConditionStorage.java
# WARNING: Unresolved types: io, jdbc, kestra

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional

from engine.jdbc.repository.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.models.conditions.condition import Condition
from engine.core.models.flows.flow_id import FlowId
from engine.core.models.triggers.multipleflows.multiple_condition_storage_interface import MultipleConditionStorageInterface
from engine.core.models.triggers.multipleflows.multiple_condition_window import MultipleConditionWindow


@dataclass(slots=True, kw_only=True)
class AbstractJdbcMultipleConditionStorage(ABC, AbstractJdbcRepository):
    jdbc_repository: io.kestra.jdbc.AbstractJdbcRepository[MultipleConditionWindow] | None = None

    def get(self, flow: FlowId, condition_id: str) -> Optional[MultipleConditionWindow]:
        raise NotImplementedError  # TODO: translate from Java

    def expired(self, tenant_id: str) -> list[MultipleConditionWindow]:
        raise NotImplementedError  # TODO: translate from Java

    def get_end_data_condition(self) -> Condition:
        raise NotImplementedError  # TODO: translate from Java

    def save(self, multiple_condition_windows: list[MultipleConditionWindow]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, multiple_condition_window: MultipleConditionWindow) -> None:
        raise NotImplementedError  # TODO: translate from Java

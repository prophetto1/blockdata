from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\RequestUtils.java
# WARNING: Unresolved types: ChildFilter

from dataclasses import dataclass, field
from datetime import datetime
from datetime import timedelta
from typing import Any, ClassVar

from engine.core.repositories.execution_repository_interface import ExecutionRepositoryInterface
from engine.core.models.flows.flow_scope import FlowScope
from engine.core.models.query_filter import QueryFilter
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class RequestUtils:
    query_string_separator: ClassVar[str] = ":"

    @staticmethod
    def to_map(query_string: list[str]) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_filters_or_default_to_legacy_mapping(filters: list[QueryFilter], query: str, namespace: str | None = None, flow_id: str | None = None, trigger_id: str | None = None, min_level: int | None = None, start_date: datetime | None = None, end_date: datetime | None = None, scope: list[FlowScope] | None = None, labels: list[str] | None = None, time_range: timedelta | None = None, child_filter: ExecutionRepositoryInterface.ChildFilter | None = None, state: list[State.Type] | None = None, worker_id: str | None = None, trigger_execution_id: str | None = None) -> list[QueryFilter]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def map_legacy_params_to_filters(query: str, namespace: str, flow_id: str, trigger_id: str, min_level: int, start_date: datetime, end_date: datetime, scope: list[FlowScope], labels: list[str], time_range: timedelta, child_filter: ExecutionRepositoryInterface.ChildFilter, state: list[State.Type], worker_id: str, trigger_execution_id: str) -> list[QueryFilter]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_flow_scopes(value: str) -> list[FlowScope]:
        raise NotImplementedError  # TODO: translate from Java

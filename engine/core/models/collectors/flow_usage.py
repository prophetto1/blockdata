from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\collectors\FlowUsage.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.flows.flow import Flow
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface


@dataclass(slots=True, kw_only=True)
class FlowUsage:
    tutorial_namespace: ClassVar[str] = "tutorial"
    count: int | None = None
    namespaces_count: int | None = None
    task_type_count: dict[str, int] | None = None
    trigger_type_count: dict[str, int] | None = None
    task_runner_type_count: dict[str, int] | None = None

    @staticmethod
    def of(tenant_id: str, flow_repository: FlowRepositoryInterface | None = None) -> FlowUsage:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def count(all_flows: list[Flow]) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def namespaces_count(all_flows: list[Flow]) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def task_type_count(all_flows: list[Flow]) -> dict[str, int]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def trigger_type_count(all_flows: list[Flow]) -> dict[str, int]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def task_runner_type_count(all_flows: list[Flow]) -> dict[str, int]:
        raise NotImplementedError  # TODO: translate from Java

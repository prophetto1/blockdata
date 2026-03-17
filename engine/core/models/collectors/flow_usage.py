from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\collectors\FlowUsage.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.flow import Flow
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface


@dataclass(slots=True, kw_only=True)
class FlowUsage:
    t_u_t_o_r_i_a_l__n_a_m_e_s_p_a_c_e: str = "tutorial"
    count: int | None = None
    namespaces_count: int | None = None
    task_type_count: dict[str, int] | None = None
    trigger_type_count: dict[str, int] | None = None
    task_runner_type_count: dict[str, int] | None = None

    @staticmethod
    def of(tenant_id: str, flow_repository: FlowRepositoryInterface) -> FlowUsage:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(flow_repository: FlowRepositoryInterface) -> FlowUsage:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(flows: list[Flow]) -> FlowUsage:
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

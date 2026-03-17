from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta
from pathlib import Path

from integrations.kubernetes.abstract_pod import AbstractPod
from integrations.kubernetes.models.connection import Connection
from integrations.kubernetes.models.metadata import Metadata
from integrations.kubernetes.services.pod_log_service import PodLogService
from integrations.kubernetes.models.pod_status import PodStatus
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.flows.state import State


@dataclass(slots=True, kw_only=True)
class PodCreate(AbstractPod, RunnableTask):
    """Run a Kubernetes pod and collect logs"""
    metadata: dict[String, Object] | None = None
    spec: dict[String, Object]
    delete: Property[bool]
    resume: Property[bool]
    wait_for_log_interval: Property[timedelta]
    k_e_s_t_r_a__w_o_r_k_i_n_g__d_i_r: str | None = None
    w_o_r_k_i_n_g__d_i_r__v_a_r: str | None = None
    o_u_t_p_u_t__f_i_l_e_s__v_a_r: str | None = None
    killed: AtomicBoolean | None = None
    current_pod_name: AtomicReference[String] | None = None
    current_namespace: str | None = None
    current_connection: Connection | None = None

    def run(self, run_context: RunContext) -> PodCreate:
        raise NotImplementedError  # TODO: translate from Java

    def find_or_create_pod(self, run_context: RunContext, client: KubernetesClient, namespace: str, additional_vars: dict[String, Object], logger: Logger) -> Pod:
        raise NotImplementedError  # TODO: translate from Java

    def output_files(self, run_context: RunContext, outputs: list[String], path_map: dict[Path, Path]) -> dict[String, URI]:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_unique_name_for_file(self, path: Path) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def create_pod(self, run_context: RunContext, client: KubernetesClient, namespace: str, additional_vars: dict[String, Object]) -> Pod:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, client: KubernetesClient, logger: Logger, pod: Pod, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_end(self, ended: Pod, run_context: RunContext, has_output_files: bool, client: KubernetesClient, pod_log_service: PodLogService) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def is_failed(self, pod_status: PodStatus) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        metadata: Metadata | None = None
        status: PodStatus | None = None
        output_files: dict[String, URI] | None = None
        vars: dict[String, Object] | None = None

        def final_state(self) -> Optional[State]:
            raise NotImplementedError  # TODO: translate from Java

        def state_from_status(self, status: PodStatus) -> Optional[State]:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(io):
    metadata: Metadata | None = None
    status: PodStatus | None = None
    output_files: dict[String, URI] | None = None
    vars: dict[String, Object] | None = None

    def final_state(self) -> Optional[State]:
        raise NotImplementedError  # TODO: translate from Java

    def state_from_status(self, status: PodStatus) -> Optional[State]:
        raise NotImplementedError  # TODO: translate from Java

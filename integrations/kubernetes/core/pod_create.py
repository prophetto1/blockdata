from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\core\PodCreate.java
# WARNING: Unresolved types: AtomicBoolean, AtomicReference, Exception, IOException, KubernetesClient, Logger, Pod, core, exceptions, io, java, kestra, models, tasks

from dataclasses import dataclass, field
from pathlib import Path
from datetime import timedelta
from typing import Any, ClassVar, Optional

from integrations.kubernetes.abstract_pod import AbstractPod
from integrations.kubernetes.models.connection import Connection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.kubernetes.models.metadata import Metadata
from integrations.kubernetes.services.pod_log_service import PodLogService
from integrations.kubernetes.models.pod_status import PodStatus
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class PodCreate(AbstractPod):
    """Run a Kubernetes pod and collect logs"""
    spec: dict[str, Any]
    delete: Property[bool] = Property.ofValue(true)
    resume: Property[bool] = Property.ofValue(true)
    wait_for_log_interval: Property[timedelta] = Property.ofValue(Duration.ofSeconds(30))
    k_e_s_t_r_a__w_o_r_k_i_n_g__d_i_r: ClassVar[str] = "/kestra/working-dir"
    w_o_r_k_i_n_g__d_i_r__v_a_r: ClassVar[str] = "workingDir"
    o_u_t_p_u_t__f_i_l_e_s__v_a_r: ClassVar[str] = "outputFiles"
    killed: AtomicBoolean = new AtomicBoolean(false)
    current_pod_name: AtomicReference[str] = new AtomicReference<>()
    metadata: dict[str, Any] | None = None
    current_namespace: str | None = None
    current_connection: Connection | None = None

    def run(self, run_context: RunContext) -> PodCreate.Output:
        raise NotImplementedError  # TODO: translate from Java

    def find_or_create_pod(self, run_context: RunContext, client: KubernetesClient, namespace: str, additional_vars: dict[str, Any], logger: Logger) -> Pod:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def output_files(run_context: RunContext, outputs: list[str], path_map: dict[Path, Path]) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_unique_name_for_file(path: Path) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def create_pod(self, run_context: RunContext, client: KubernetesClient, namespace: str, additional_vars: dict[str, Any]) -> Pod:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, client: KubernetesClient, logger: Logger, pod: Pod, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_end(self, ended: Pod, run_context: RunContext, has_output_files: bool, client: KubernetesClient, pod_log_service: PodLogService) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_failed(pod_status: PodStatus) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        metadata: Metadata | None = None
        status: PodStatus | None = None
        output_files: dict[str, str] | None = None
        vars: dict[str, Any] | None = None

        def final_state(self) -> Optional[State.Type]:
            raise NotImplementedError  # TODO: translate from Java

        def state_from_status(self, status: PodStatus) -> Optional[State.Type]:
            raise NotImplementedError  # TODO: translate from Java

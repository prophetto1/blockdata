from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\AbstractPod.java
# WARNING: Unresolved types: Container, Exception, HasMetadata, IOException, Logger, PodResource, PodSpec, ResourceRequirements, VolumeMount

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from datetime import timedelta
from typing import Any, ClassVar

from integrations.aws.abstract_connection import AbstractConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.kubernetes.models.side_car import SideCar


@dataclass(slots=True, kw_only=True)
class AbstractPod(ABC, AbstractConnection):
    i_n_i_t__f_i_l_e_s__c_o_n_t_a_i_n_e_r__n_a_m_e: ClassVar[str] = "init-files"
    s_i_d_e_c_a_r__f_i_l_e_s__c_o_n_t_a_i_n_e_r__n_a_m_e: ClassVar[str] = "out-files"
    f_i_l_e_s__v_o_l_u_m_e__n_a_m_e: ClassVar[str] = "kestra-files"
    r_e_a_d_y__m_a_r_k_e_r: ClassVar[str] = "ready"
    e_n_d_e_d__m_a_r_k_e_r: ClassVar[str] = "ended"
    namespace: Property[str] = Property.ofValue("default")
    file_sidecar: SideCar = SideCar.builder().build()
    wait_until_ready: Property[timedelta] = Property.ofValue(Duration.ZERO)
    output_files: Property[list[str]] | None = None
    input_files: Any | None = None
    container_default_spec: Property[dict[str, Any]] | None = None

    def init(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def upload_input_files(self, run_context: RunContext, pod_resource: PodResource, logger: Logger, input_files: set[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def download_output_files(self, run_context: RunContext, pod_resource: PodResource, logger: Logger, additional_vars: dict[str, Any]) -> dict[Path, Path]:
        raise NotImplementedError  # TODO: translate from Java

    def move_file(self, from: Path, to: Path) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def apply_container_default_spec(self, run_context: RunContext, spec: PodSpec) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def merge_container_defaults(self, run_context: RunContext, container: Container, default_spec_map: dict[str, Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def container_to_map(self, obj: Any) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def deep_merge(self, base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def handle_files(self, run_context: RunContext, spec: PodSpec) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def parse_spec(self, spec: str) -> list[HasMetadata]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def map_sidecar_resources(run_context: RunContext, side_car: SideCar) -> ResourceRequirements:
        raise NotImplementedError  # TODO: translate from Java

    def get_sidecar_default_spec(self, run_context: RunContext, side_car: SideCar) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def apply_sidecar_default_spec(self, run_context: RunContext, container: Container, side_car: SideCar) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def files_container(self, run_context: RunContext, volume_mount: VolumeMount, finished: bool) -> Container:
        raise NotImplementedError  # TODO: translate from Java

    def working_directory_init_container(self, run_context: RunContext, volume_mount: VolumeMount) -> Container:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-argocd\src\main\java\io\kestra\plugin\argocd\apps\AbstractArgoCD.java
# WARNING: Unresolved types: Exception, ObjectMapper, StringBuilder

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.tasks.runners.abstract_log_consumer import AbstractLogConsumer
from engine.plugin.scripts.runner.docker.docker import Docker
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from integrations.azure.batch.models.task import Task
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class AbstractArgoCD(ABC, Task):
    server: Property[str]
    token: Property[str]
    application: Property[str]
    d_e_f_a_u_l_t__i_m_a_g_e: ClassVar[str] = "curlimages/curl:latest"
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    insecure: Property[bool] = Property.ofValue(true)
    task_runner: TaskRunner[Any] = Docker.builder()
        .type(Docker.class.getName())
        .entryPoint(new ArrayList<>())
        .build()
    container_image: Property[str] = Property.ofValue(DEFAULT_IMAGE)
    plaintext: Property[bool] = Property.ofValue(false)
    grpc_web: Property[bool] = Property.ofValue(false)
    env: dict[str, str] | None = None
    server_cert: Property[str] | None = None
    argo_c_d_version: Property[str] | None = None

    def get_install_commands(self, run_context: RunContext) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_server_args(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_cert_commands(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_environment_variables(self, run_context: RunContext) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def build_stdout_consumer(self, builder: StringBuilder, run_context: RunContext) -> AbstractLogConsumer:
        raise NotImplementedError  # TODO: translate from Java

    def parse_sync_status(self, status_map: dict[str, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def parse_health_status(self, status_map: dict[str, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def parse_resources(self, status_map: dict[str, Any]) -> list[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def execute_commands(self, run_context: RunContext, commands: list[str], log_consumer: AbstractLogConsumer) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

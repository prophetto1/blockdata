from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from engine.core.models.tasks.runners.abstract_log_consumer import AbstractLogConsumer
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from engine.core.models.tasks.task import Task
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class AbstractArgoCD(Task):
    d_e_f_a_u_l_t__i_m_a_g_e: str | None = None
    o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper | None = None
    server: Property[str]
    token: Property[str]
    application: Property[str]
    insecure: Property[bool] | None = None
    task_runner: TaskRunner[Any] | None = None
    container_image: Property[str] | None = None
    env: dict[String, String] | None = None
    server_cert: Property[str] | None = None
    plaintext: Property[bool] | None = None
    grpc_web: Property[bool] | None = None
    argo_c_d_version: Property[str] | None = None

    def get_install_commands(self, run_context: RunContext) -> list[String]:
        raise NotImplementedError  # TODO: translate from Java

    def get_server_args(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_cert_commands(self) -> list[String]:
        raise NotImplementedError  # TODO: translate from Java

    def get_environment_variables(self, run_context: RunContext) -> dict[String, String]:
        raise NotImplementedError  # TODO: translate from Java

    def build_stdout_consumer(self, builder: StringBuilder, run_context: RunContext) -> AbstractLogConsumer:
        raise NotImplementedError  # TODO: translate from Java

    def parse_sync_status(self, status_map: dict[String, Object]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def parse_health_status(self, status_map: dict[String, Object]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def parse_resources(self, status_map: dict[String, Object]) -> list[Map[String, Object]]:
        raise NotImplementedError  # TODO: translate from Java

    def execute_commands(self, run_context: RunContext, commands: list[String], log_consumer: AbstractLogConsumer) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

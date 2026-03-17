from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.kubernetes.abstract_connection import AbstractConnection
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.models.tasks.input_files_interface import InputFilesInterface
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.models.tasks.namespace_files_interface import NamespaceFilesInterface
from engine.core.models.tasks.output_files_interface import OutputFilesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from engine.core.models.tasks.runners.task_runner import TaskRunner


class CredentialSource(str, Enum):
    ENVIRONMENT = "ENVIRONMENT"
    EC2_INSTANCE_METADATA = "EC2_INSTANCE_METADATA"
    ECS_CONTAINER = "ECS_CONTAINER"


class OutputFormat(str, Enum):
    JSON = "JSON"
    TEXT = "TEXT"
    TABLE = "TABLE"
    YAML = "YAML"


@dataclass(slots=True, kw_only=True)
class AwsCLI(AbstractConnection, RunnableTask, NamespaceFilesInterface, InputFilesInterface, OutputFilesInterface):
    """Execute AWS CLI commands in a task"""
    d_e_f_a_u_l_t__i_m_a_g_e: str | None = None
    commands: list[String]
    env: dict[String, String] | None = None
    docker: DockerOptions | None = None
    task_runner: TaskRunner[Any] | None = None
    container_image: str = DEFAULT_IMAGE
    output_format: OutputFormat = OutputFormat.JSON
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    output_files: Property[list[String]] | None = None
    sts_credential_source: CredentialSource | None = None

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def inject_defaults(self, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

    def get_env(self, run_context: RunContext) -> dict[String, String]:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\cli\AwsCLI.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar

from integrations.aws.abstract_connection import AbstractConnection
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.tasks.input_files_interface import InputFilesInterface
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.models.tasks.namespace_files_interface import NamespaceFilesInterface
from engine.core.models.tasks.output_files_interface import OutputFilesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class AwsCLI(AbstractConnection):
    """Execute AWS CLI commands in a task"""
    commands: list[str]
    d_e_f_a_u_l_t__i_m_a_g_e: ClassVar[str] = "amazon/aws-cli"
    task_runner: TaskRunner[Any] = Docker.instance()
    container_image: str = DEFAULT_IMAGE
    output_format: OutputFormat = OutputFormat.JSON
    env: dict[str, str] | None = None
    docker: DockerOptions | None = None
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    output_files: Property[list[str]] | None = None
    sts_credential_source: CredentialSource | None = None

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def inject_defaults(self, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

    def get_env(self, run_context: RunContext) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    class CredentialSource(str, Enum):
        ENVIRONMENT = "ENVIRONMENT"
        EC2_INSTANCE_METADATA = "EC2_INSTANCE_METADATA"
        ECS_CONTAINER = "ECS_CONTAINER"

    class OutputFormat(str, Enum):
        JSON = "JSON"
        TEXT = "TEXT"
        TABLE = "TABLE"
        YAML = "YAML"

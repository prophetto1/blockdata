from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-redis\src\main\java\io\kestra\plugin\redis\cli\RedisCLI.java
# WARNING: Unresolved types: Exception, StringBuilder

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.plugin.scripts.runner.docker.docker import Docker
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.models.tasks.input_files_interface import InputFilesInterface
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.models.tasks.namespace_files_interface import NamespaceFilesInterface
from engine.core.models.tasks.output_files_interface import OutputFilesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from integrations.azure.batch.models.task import Task
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class RedisCLI(Task):
    """Run Redis CLI commands in a container"""
    host: Property[str]
    commands: Property[list[str]]
    d_e_f_a_u_l_t__i_m_a_g_e: ClassVar[str] = "redis:7-alpine"
    port: Property[int] = Property.ofValue(6379)
    database: Property[int] = Property.ofValue(0)
    tls: Property[bool] = Property.ofValue(false)
    json_output: Property[bool] = Property.ofValue(false)
    container_image: Property[str] = Property.ofValue(DEFAULT_IMAGE)
    task_runner: TaskRunner[Any] = Docker.builder()
        .type(Docker.class.getName())
        .entryPoint(new ArrayList<>())
        .build()
    docker: Property[DockerOptions] = Property.ofValue(DockerOptions.builder().build())
    username: Property[str] | None = None
    password: Property[str] | None = None
    env: Property[dict[str, str]] | None = None
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    output_files: Property[list[str]] | None = None

    @staticmethod
    def escape_for_json(s: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def extract_wrapped_shell_commands(self, r_commands: list[str], base_command: StringBuilder) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_namespace_files(self) -> NamespaceFiles:
        raise NotImplementedError  # TODO: translate from Java

    def get_input_files(self) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_output_files(self) -> Property[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

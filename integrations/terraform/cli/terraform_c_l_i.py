from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-terraform\src\main\java\io\kestra\plugin\terraform\cli\TerraformCLI.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from typing import Any, ClassVar

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
class TerraformCLI(Task):
    """Run Terraform CLI commands in Docker"""
    commands: Property[list[str]]
    d_e_f_a_u_l_t__i_m_a_g_e: ClassVar[str] = "hashicorp/terraform"
    task_runner: TaskRunner[Any] = Docker.instance()
    container_image: Property[str] = Property.ofValue(DEFAULT_IMAGE)
    before_commands: Property[list[str]] | None = None
    env: dict[str, str] | None = None
    docker: DockerOptions | None = None
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    output_files: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def inject_defaults(self, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

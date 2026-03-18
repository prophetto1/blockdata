from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cli\AbstractDbt.java
# WARNING: Unresolved types: Exception, IOException, java, util

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

from engine.plugin.scripts.runner.docker.docker import Docker
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.tasks.input_files_interface import InputFilesInterface
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.models.tasks.namespace_files_interface import NamespaceFilesInterface
from engine.core.models.tasks.output_files_interface import OutputFilesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.runner_type import RunnerType
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from integrations.azure.batch.models.task import Task
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class AbstractDbt(ABC, Task):
    d_e_f_a_u_l_t__i_m_a_g_e: ClassVar[str] = "ghcr.io/kestra-io/dbt"
    fail_fast: Property[bool] = Property.ofValue(false)
    warn_error: Property[bool] = Property.ofValue(false)
    debug: Property[bool] = Property.ofValue(false)
    dbt_path: Property[str] = Property.ofValue("./bin/dbt")
    task_runner: TaskRunner[Any] = Docker.builder()
        .type(Docker.class.getName())
        .entryPoint(new ArrayList<>())
        .build()
    container_image: Property[str] = Property.ofValue(DEFAULT_IMAGE)
    parse_run_results: Property[bool] = Property.ofValue(Boolean.TRUE)
    project_dir: Property[str] | None = None
    profiles: Property[str] | None = None
    runner: Property[RunnerType] | None = None
    docker: Property[DockerOptions] | None = None
    docker_options: Property[DockerOptions] | None = None
    env: Property[dict[str, str]] | None = None
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    output_files: Property[list[str]] | None = None

    @abstractmethod
    def dbt_commands(self, run_context: RunContext) -> java.util.List[str]:
        ...

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def create_dbt_command(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def parse_results(self, run_context: RunContext, working_directory: Path, script_output: ScriptOutput) -> None:
        raise NotImplementedError  # TODO: translate from Java

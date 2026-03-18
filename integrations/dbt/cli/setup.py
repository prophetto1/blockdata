from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cli\Setup.java
# WARNING: Unresolved types: Exception, IOException, JsonProcessingException, ObjectMapper

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

from engine.plugin.scripts.exec.abstract_exec_script import AbstractExecScript
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class Setup(AbstractExecScript):
    """Setup dbt in a Python virtualenv (Deprecated)."""
    profiles: Property[Any]
    requirements: Property[list[str]]
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofYaml()
    d_e_f_a_u_l_t__i_m_a_g_e: ClassVar[str] = "python"
    python_path: str = DEFAULT_IMAGE
    exit_on_failed: Property[bool] = Property.ofValue(Boolean.TRUE)
    task_runner: TaskRunner[Any] = Docker.instance()
    container_image: Property[str] = Property.ofValue(DEFAULT_IMAGE)
    input_files: Property[Any] | None = None
    docker_options: Property[DockerOptions] | None = None

    def inject_defaults(self, run_context: RunContext, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def virtual_env_command(self, run_context: RunContext, working_directory: Path, requirements: list[str]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def profiles_content(self, run_context: RunContext, profiles: Any) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def final_input_files(self, run_context: RunContext) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

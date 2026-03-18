from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dlt\src\main\java\io\kestra\plugin\dlt\CLI.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.plugin.scripts.exec.abstract_exec_script import AbstractExecScript
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.tasks.input_files_interface import InputFilesInterface
from engine.core.models.tasks.namespace_files_interface import NamespaceFilesInterface
from engine.core.models.tasks.output_files_interface import OutputFilesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput


@dataclass(slots=True, kw_only=True)
class CLI(AbstractExecScript):
    """Execute dlt (data load tool) commands to extract, and load data from various sources."""
    commands: Property[list[str]]
    d_e_f_a_u_l_t__i_m_a_g_e: ClassVar[str] = "ghcr.io/kestra-io/dlt"
    container_image: Property[str] = Property.ofValue(DEFAULT_IMAGE)

    def inject_defaults(self, run_context: RunContext, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

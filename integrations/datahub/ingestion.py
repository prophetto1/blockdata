from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from pathlib import Path

from engine.core.models.tasks.input_files_interface import InputFilesInterface
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.models.tasks.namespace_files_interface import NamespaceFilesInterface
from engine.core.models.tasks.output_files_interface import OutputFilesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from engine.core.models.tasks.task import Task
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class Ingestion(Task, RunnableTask, NamespaceFilesInterface, InputFilesInterface, OutputFilesInterface):
    """Run a DataHub ingestion."""
    m_a_p_p_e_r: ObjectMapper | None = None
    d_e_f_a_u_l_t__i_m_a_g_e: str | None = None
    container_image: str = DEFAULT_IMAGE
    env: dict[String, String] | None = None
    task_runner: TaskRunner[Any] | None = None
    recipe: Any
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    output_files: Property[list[String]] | None = None

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def get_recipe(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def store(self, file: Path, yaml: dict[String, Object]) -> str:
        raise NotImplementedError  # TODO: translate from Java

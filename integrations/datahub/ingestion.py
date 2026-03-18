from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datahub\src\main\java\io\kestra\plugin\datahub\Ingestion.java
# WARNING: Unresolved types: Exception, IOException, ObjectMapper

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

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
class Ingestion(Task):
    """Run a DataHub ingestion."""
    recipe: Any
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofYaml()
    d_e_f_a_u_l_t__i_m_a_g_e: ClassVar[str] = "acryldata/datahub-ingestion:head"
    container_image: str = DEFAULT_IMAGE
    task_runner: TaskRunner[Any] = Docker.instance()
    env: dict[str, str] | None = None
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    output_files: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def get_recipe(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def store(self, file: Path, yaml: dict[str, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

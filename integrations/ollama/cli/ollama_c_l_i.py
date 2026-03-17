from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

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
class OllamaCLI(Task, RunnableTask, NamespaceFilesInterface, InputFilesInterface, OutputFilesInterface):
    """Run Ollama CLI commands in flows"""
    d_e_f_a_u_l_t__i_m_a_g_e: str | None = None
    o_l_l_a_m_a__c_o_n_t_a_i_n_e_r__m_o_d_e_l_s__p_a_t_h: str | None = None
    commands: Property[list[String]]
    env: Property[dict[String, String]] | None = None
    task_runner: TaskRunner[Any] | None = None
    container_image: Property[str] | None = None
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    output_files: Property[list[String]] | None = None
    enable_model_caching: Property[bool] | None = None
    model_cache_path: Property[str] | None = None
    host: Property[str] | None = None

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def configure_task_runner(self, run_context: RunContext) -> TaskRunner[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_env(self, run_context: RunContext) -> dict[String, String]:
        raise NotImplementedError  # TODO: translate from Java

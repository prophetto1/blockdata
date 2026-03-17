from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.cloudquery.abstract_cloud_query_command import AbstractCloudQueryCommand
from engine.core.models.tasks.input_files_interface import InputFilesInterface
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.models.tasks.namespace_files_interface import NamespaceFilesInterface
from engine.core.models.tasks.output_files_interface import OutputFilesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput


@dataclass(slots=True, kw_only=True)
class Sync(AbstractCloudQueryCommand, RunnableTask, NamespaceFilesInterface, InputFilesInterface, OutputFilesInterface):
    """Run a CloudQuery sync"""
    o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper | None = None
    d_b__f_i_l_e_n_a_m_e: str | None = None
    c_l_o_u_d__q_u_e_r_y__s_t_a_t_e: str | None = None
    configs: list[Object]
    incremental: Property[bool] | None = None
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    output_files: Property[list[String]] | None = None
    log_console: Property[bool] | None = None

    def compute_k_v_entry_name(self, run_context: RunContext, state_name: str, task_run_value: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def get_incremental_sqlite_destination(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def get_backend_option_object(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def read_configs(self, run_context: RunContext, configurations: list[Object], backend_options_object: dict[String, Object]) -> list[Map[String, Object]]:
        raise NotImplementedError  # TODO: translate from Java

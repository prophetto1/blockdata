from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from pathlib import Path

from engine.core.models.assets.asset_identifier import AssetIdentifier
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
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
class AnsibleCLI(Task, RunnableTask, NamespaceFilesInterface, InputFilesInterface, OutputFilesInterface):
    """Run Ansible CLI commands"""
    d_e_f_a_u_l_t__i_m_a_g_e: str | None = None
    a_n_s_i_b_l_e__c_f_g: str | None = None
    p_l_u_g_i_n_s__k_e_s_t_r_a__l_o_g_g_e_r__p_y: str | None = None
    i_n_v_e_n_t_o_r_y__f_i_l_e: str | None = None
    v_m__a_s_s_e_t__t_y_p_e: str | None = None
    a_s_s_e_t__i_d__p_a_t_t_e_r_n: Pattern | None = None
    before_commands: Property[list[String]] | None = None
    commands: Property[list[String]]
    env: Property[dict[String, String]] | None = None
    docker: DockerOptions | None = None
    task_runner: TaskRunner[Any] | None = None
    container_image: Property[str] | None = None
    ansible_config: Property[str] | None = None
    output_log_file: Property[bool] | None = None
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    output_files: Property[list[String]] | None = None

    def run(self, run_context: RunContext) -> AnsibleOutput:
        raise NotImplementedError  # TODO: translate from Java

    def final_input_files(self, run_context: RunContext, working_dir: Path) -> dict[String, String]:
        raise NotImplementedError  # TODO: translate from Java

    def inject_defaults(self, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

    def emit_inventory_assets(self, run_context: RunContext, working_dir: Path) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def extract_inventory_asset_inputs(self, inventory_content: str) -> list[AssetIdentifier]:
        raise NotImplementedError  # TODO: translate from Java

    def strip_inline_comment(self, raw_line: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_playbooks(self, vars: dict[String, Object]) -> list[AnsibleOutput]:
        raise NotImplementedError  # TODO: translate from Java

    def emit_dynamic_task_runs(self, run_context: RunContext, playbooks: list[AnsibleOutput]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class AnsibleOutput(ScriptOutput):
        playbooks: list[PlaybookOutput] | None = None


@dataclass(slots=True, kw_only=True)
class AnsibleOutput(ScriptOutput):
    playbooks: list[PlaybookOutput] | None = None

    @dataclass(slots=True)
    class PlaybookOutput:
        plays: list[PlayOutput] | None = None

    @dataclass(slots=True)
    class PlayOutput:
        name: str | None = None
        tasks: list[TaskOutput] | None = None

    @dataclass(slots=True)
    class TaskOutput:
        uid: str | None = None
        name: str | None = None
        started_at: str | None = None
        ended_at: str | None = None
        hosts: list[HostResult] | None = None

    @dataclass(slots=True)
    class HostResult:
        host: str | None = None
        status: str | None = None
        result: Any | None = None


@dataclass(slots=True, kw_only=True)
class PlaybookOutput:
    plays: list[PlayOutput] | None = None


@dataclass(slots=True, kw_only=True)
class PlayOutput:
    name: str | None = None
    tasks: list[TaskOutput] | None = None


@dataclass(slots=True, kw_only=True)
class TaskOutput:
    uid: str | None = None
    name: str | None = None
    started_at: str | None = None
    ended_at: str | None = None
    hosts: list[HostResult] | None = None


@dataclass(slots=True, kw_only=True)
class HostResult:
    host: str | None = None
    status: str | None = None
    result: Any | None = None

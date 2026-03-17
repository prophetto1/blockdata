from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-ansible\src\main\java\io\kestra\plugin\ansible\cli\AnsibleCLI.java
# WARNING: Unresolved types: Exception, HostResult, IOException, Pattern, PlayOutput, PlaybookOutput, TaskOutput

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

from engine.core.models.assets.asset_identifier import AssetIdentifier
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
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
class AnsibleCLI(Task):
    """Run Ansible CLI commands"""
    commands: Property[list[str]]
    d_e_f_a_u_l_t__i_m_a_g_e: ClassVar[str] = "cytopia/ansible:latest-tools"
    a_n_s_i_b_l_e__c_f_g: ClassVar[str] = "ansible.cfg"
    p_l_u_g_i_n_s__k_e_s_t_r_a__l_o_g_g_e_r__p_y: ClassVar[str] = "callback_plugins/kestra_logger.py"
    i_n_v_e_n_t_o_r_y__f_i_l_e: ClassVar[str] = "inventory.ini"
    v_m__a_s_s_e_t__t_y_p_e: ClassVar[str] = "io.kestra.plugin.ee.assets.VM"
    a_s_s_e_t__i_d__p_a_t_t_e_r_n: ClassVar[Pattern] = Pattern.compile("^[a-zA-Z0-9][a-zA-Z0-9._-]*$")
    task_runner: TaskRunner[Any] = Docker.instance()
    container_image: Property[str] = Property.ofValue(DEFAULT_IMAGE)
    ansible_config: Property[str] = Property.ofExpression("""
        [defaults]
        log_path          = {{ workingDir }}/log
        callback_plugins  = ./callback_plugins
        callbacks_enabled = kestra_logger
        stdout_callback   = ansible.builtin.null
        result_format     = json
        pretty_results    = true
        """)
    output_log_file: Property[bool] = Property.ofValue(false)
    before_commands: Property[list[str]] | None = None
    env: Property[dict[str, str]] | None = None
    docker: DockerOptions | None = None
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    output_files: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> AnsibleOutput:
        raise NotImplementedError  # TODO: translate from Java

    def final_input_files(self, run_context: RunContext, working_dir: Path) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def inject_defaults(self, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

    def emit_inventory_assets(self, run_context: RunContext, working_dir: Path) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def extract_inventory_asset_inputs(inventory_content: str) -> list[AssetIdentifier]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def strip_inline_comment(raw_line: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_playbooks(self, vars: dict[str, Any]) -> list[AnsibleOutput.PlaybookOutput]:
        raise NotImplementedError  # TODO: translate from Java

    def emit_dynamic_task_runs(self, run_context: RunContext, playbooks: list[AnsibleOutput.PlaybookOutput]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
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

from __future__ import annotations

# Source: E:\KESTRA\script\src\main\java\io\kestra\plugin\scripts\runner\docker\Docker.java
# WARNING: Unresolved types: CreateContainerCmd, DockerClient, Exception, IOException, Logger, Pattern, ReadableBytesTypeConverter

from dataclasses import dataclass, field
from enum import Enum
from datetime import timedelta
from typing import Any, ClassVar

from engine.plugin.scripts.runner.docker.cpu import Cpu
from engine.plugin.scripts.runner.docker.credentials import Credentials
from engine.plugin.scripts.runner.docker.device_request import DeviceRequest
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.plugin.scripts.runner.docker.memory import Memory
from engine.core.models.property.property import Property
from engine.plugin.scripts.runner.docker.pull_policy import PullPolicy
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runners.task_commands import TaskCommands
from engine.core.models.tasks.runners.task_runner import TaskRunner
from engine.core.models.tasks.runners.task_runner_detail_result import TaskRunnerDetailResult
from engine.core.models.tasks.runners.task_runner_result import TaskRunnerResult


@dataclass(slots=True, kw_only=True)
class Docker(TaskRunner):
    """Run a task in a Docker container."""
    r_e_a_d_a_b_l_e__b_y_t_e_s__t_y_p_e__c_o_n_v_e_r_t_e_r: ClassVar[ReadableBytesTypeConverter] = new ReadableBytesTypeConverter()
    n_e_w_l_i_n_e__p_a_t_t_e_r_n: ClassVar[Pattern] = Pattern.compile("([^\\r\\n]+)[\\r\\n]+")
    l_e_g_a_c_y__v_o_l_u_m_e__e_n_a_b_l_e_d__c_o_n_f_i_g: ClassVar[str] = "kestra.tasks.scripts.docker.volume-enabled"
    v_o_l_u_m_e__e_n_a_b_l_e_d__c_o_n_f_i_g: ClassVar[str] = "volume-enabled"
    entry_point: list[str] = List.of("")
    pull_policy: Property[PullPolicy] = Property.ofValue(PullPolicy.IF_NOT_PRESENT)
    file_handling_strategy: Property[FileHandlingStrategy] = Property.ofValue(FileHandlingStrategy.VOLUME)
    delete: Property[bool] = Property.ofValue(true)
    wait: Property[bool] = Property.ofValue(true)
    kill_grace_period: timedelta = Duration.ZERO
    resume: Property[bool] = Property.ofValue(true)
    host: str | None = None
    config: Any | None = None
    credentials: Credentials | None = None
    image: str | None = None
    user: str | None = None
    extra_hosts: list[str] | None = None
    network_mode: str | None = None
    port_bindings: list[str] | None = None
    volumes: list[str] | None = None
    device_requests: list[DeviceRequest] | None = None
    cpu: Cpu | None = None
    memory: Memory | None = None
    shm_size: str | None = None
    privileged: Property[bool] | None = None

    @staticmethod
    def instance() -> Docker:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from(docker_options: DockerOptions) -> Docker:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext, task_commands: TaskCommands, files_to_download: list[str]) -> TaskRunnerResult[DockerTaskRunnerDetailResult]:
        raise NotImplementedError  # TODO: translate from Java

    def download_output_files(self, exec_id: str, docker_client: DockerClient, run_context: RunContext, task_commands: TaskCommands) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self, docker_client: DockerClient, container_id: str, logger: Logger) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def runner_additional_vars(self, run_context: RunContext, task_commands: TaskCommands) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def docker_client(self, run_context: RunContext, image: str, host: str) -> DockerClient:
        raise NotImplementedError  # TODO: translate from Java

    def configure(self, task_commands: TaskCommands, docker_client: DockerClient, run_context: RunContext, additional_vars: dict[str, Any]) -> CreateContainerCmd:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def convert_bytes(bytes: str) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def get_image_name_without_tag(self, full_image_name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def pull_image(self, docker_client: DockerClient, image: str, policy: PullPolicy, logger: Logger) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class DockerTaskRunnerDetailResult(TaskRunnerDetailResult):
        container_id: str | None = None

    class FileHandlingStrategy(str, Enum):
        MOUNT = "MOUNT"
        VOLUME = "VOLUME"

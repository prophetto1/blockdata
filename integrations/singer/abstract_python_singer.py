from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\AbstractPythonSinger.java
# WARNING: Unresolved types: Consumer, Exception, IOException, Logger, ObjectMapper, Stream, TypeReference

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime
from typing import Any, ClassVar

from engine.core.models.tasks.runners.abstract_log_consumer import AbstractLogConsumer
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.singer.models.metric import Metric
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class AbstractPythonSinger(ABC, Task):
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
        .setSerializationInclusion(JsonInclude.Include.NON_NULL)
    t_y_p_e__r_e_f_e_r_e_n_c_e: ClassVar[TypeReference[dict[str, Any]]] = new TypeReference<>() {
    }
    d_e_f_a_u_l_t__i_m_a_g_e: ClassVar[str] = "python:3.10.12"
    metrics: list[Metric] = field(default_factory=list)
    state_records: dict[str, Any] = field(default_factory=dict)
    state_name: Property[str] = Property.ofValue("singer-state")
    task_runner: TaskRunner[Any] = Docker.instance()
    container_image: Property[str] = Property.ofValue(DEFAULT_IMAGE)
    working_directory: Path | None = None
    pip_packages: Property[list[str]] | None = None
    command: Property[str] | None = None
    docker: DockerOptions | None = None

    def inject_defaults(self, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def configuration(self, run_context: RunContext) -> dict[str, Any]:
        ...

    @abstractmethod
    def pip_packages(self) -> Property[list[str]]:
        ...

    @abstractmethod
    def command(self) -> Property[str]:
        ...

    def final_command(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext, command: str, log_consumer: AbstractLogConsumer) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def pip_install_commands(self, run_context: RunContext) -> Stream[str]:
        raise NotImplementedError  # TODO: translate from Java

    def log_setup_commands(self) -> Stream[str]:
        raise NotImplementedError  # TODO: translate from Java

    def config_setup_commands(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def environment_variables(self, run_context: RunContext) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def write_singer_files(self, filename: str, content: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write_singer_files(self, filename: str, map: Any) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def save_singer_metrics(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def save_state(self, run_context: RunContext, state: str, state_records: dict[str, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def state_message(self, state_value: dict[str, Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class SingerLogDispatcher(AbstractLogConsumer):
        singer_log_parser: SingerLogParser | None = None
        singer_log_sync: SingerLogSync | None = None

        def accept(self, line: str, is_std_err: bool, instant: datetime) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def accept(self, line: str, is_std_err: bool) -> None:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class SingerLogSync(AbstractLogConsumer):
        consumer: Consumer[str] | None = None

        def accept(self, log: str, is_std_err: bool, instant: datetime) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def accept(self, log: str, is_std_err: bool) -> None:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class SingerLogParser(AbstractLogConsumer):
        logger: Logger | None = None
        metrics: list[Metric] | None = None

        def accept(self, line: str, is_std_err: bool, instant: datetime) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def accept(self, line: str, is_std_err: bool) -> None:
            raise NotImplementedError  # TODO: translate from Java

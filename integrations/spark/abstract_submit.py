from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.runner_type import RunnerType
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from engine.core.models.tasks.task import Task
from engine.core.models.tasks.runners.task_runner import TaskRunner


class DeployMode(str, Enum):
    CLIENT = "CLIENT"
    CLUSTER = "CLUSTER"


@dataclass(slots=True, kw_only=True)
class AbstractSubmit(Task, RunnableTask):
    d_e_f_a_u_l_t__i_m_a_g_e: str | None = None
    master: Property[str]
    name: Property[str] | None = None
    args: Property[list[String]] | None = None
    app_files: Property[dict[String, String]] | None = None
    verbose: Property[bool] | None = None
    configurations: Property[dict[String, String]] | None = None
    deploy_mode: Property[DeployMode] | None = None
    spark_submit_path: Property[str] | None = None
    env: Property[dict[String, String]] | None = None
    runner: Property[RunnerType] | None = None
    docker: DockerOptions | None = None
    task_runner: TaskRunner[Any] | None = None
    container_image: str = DEFAULT_IMAGE

    def configure(self, run_context: RunContext, spark: SparkLauncher) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def inject_defaults(self, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def envs(self, run_context: RunContext) -> dict[String, String]:
        raise NotImplementedError  # TODO: translate from Java

    def temp_file(self, run_context: RunContext, name: str, url: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

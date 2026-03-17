from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-spark\src\main\java\io\kestra\plugin\spark\AbstractSubmit.java
# WARNING: Unresolved types: Exception, IOException, SparkLauncher, URISyntaxException

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar

from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.runner_type import RunnerType
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from integrations.azure.batch.models.task import Task
from engine.core.models.tasks.runners.task_runner import TaskRunner


@dataclass(slots=True, kw_only=True)
class AbstractSubmit(ABC, Task):
    master: Property[str]
    d_e_f_a_u_l_t__i_m_a_g_e: ClassVar[str] = "apache/spark:4.0.1-java21-r"
    verbose: Property[bool] = Property.ofValue(false)
    deploy_mode: Property[DeployMode] = Property.ofValue(DeployMode.CLIENT)
    spark_submit_path: Property[str] = Property.ofValue("/opt/spark/bin/spark-submit")
    task_runner: TaskRunner[Any] = Docker.instance()
    container_image: str = DEFAULT_IMAGE
    name: Property[str] | None = None
    args: Property[list[str]] | None = None
    app_files: Property[dict[str, str]] | None = None
    configurations: Property[dict[str, str]] | None = None
    env: Property[dict[str, str]] | None = None
    runner: Property[RunnerType] | None = None
    docker: DockerOptions | None = None

    @abstractmethod
    def configure(self, run_context: RunContext, spark: SparkLauncher) -> None:
        ...

    def inject_defaults(self, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def envs(self, run_context: RunContext) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def temp_file(self, run_context: RunContext, name: str, url: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    class DeployMode(str, Enum):
        CLIENT = "CLIENT"
        CLUSTER = "CLUSTER"

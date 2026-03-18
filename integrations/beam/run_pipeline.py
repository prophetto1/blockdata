from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-beam\src\main\java\io\kestra\plugin\beam\RunPipeline.java
# WARNING: Unresolved types: Class, Exception, MetricQueryResults, PipelineRunner, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar

from engine.plugin.scripts.exec.abstract_exec_script import AbstractExecScript
from integrations.beam.beam_runner import BeamRunner
from integrations.beam.beam_s_d_k import BeamSDK
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.beam.config.runner_config_holder import RunnerConfigHolder
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput


@dataclass(slots=True, kw_only=True)
class RunPipeline(AbstractExecScript):
    """Execute an Apache Beam pipeline"""
    d_e_f_a_u_l_t__i_m_a_g_e: ClassVar[str] = "apache/beam_python3.11_sdk:latest"
    sdk: Property[BeamSDK] = Property.ofValue(BeamSDK.PYTHON)
    beam_runner: Property[BeamRunner] = Property.ofValue(BeamRunner.DIRECT)
    options: Property[dict[str, str]] = Property.ofValue(Collections.emptyMap())
    runner_config: Property[dict[str, Any]] = Property.ofValue(Collections.emptyMap())
    requirements: Property[list[str]] = Property.ofValue(Collections.emptyList())
    container_image: Property[str] = Property.ofValue(DEFAULT_IMAGE)
    pipeline_timeout_seconds: Property[int] = Property.ofValue(300)
    file: Property[str] | None = None
    definition: Property[str] | None = None

    def get_container_image(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_execution_mode(self, sdk: BeamSDK, runner: BeamRunner) -> ExecutionMode:
        raise NotImplementedError  # TODO: translate from Java

    def validate_configuration(self, mode: ExecutionMode, opts: dict[str, str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def run_java(self, run_context: RunContext, yaml: str, runner: BeamRunner, options: dict[str, str], runner_config_holder: RunnerConfigHolder) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def run_python_portable(self, run_context: RunContext, yaml: str, options: dict[str, str], runner_config_holder: RunnerConfigHolder, pipeline_timeout_seconds: int) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def run_python_cli(self, run_context: RunContext, yaml: str, options: dict[str, str], portable: bool, pipeline_timeout_seconds: int) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_runner_options(self, run_context: RunContext, runner: BeamRunner) -> RunnerConfigHolder:
        raise NotImplementedError  # TODO: translate from Java

    def run_command(self, run_context: RunContext, label: str, env: dict[str, str], command: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def run_command_return_output(self, run_context: RunContext, label: str, env: dict[str, str], command: str) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def build_option_args(self, options: dict[str, str], runner_options: dict[str, Any]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def stringify(self, value: Any) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def load_definition(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_runner_class(self, runner: BeamRunner) -> Class[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def publish_metrics(self, run_context: RunContext, results: MetricQueryResults) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def shell_quote(self, string_to_quote: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    class ExecutionMode(str, Enum):
        JAVA_CLASSIC = "JAVA_CLASSIC"
        PYTHON_DIRECT = "PYTHON_DIRECT"
        PYTHON_PORTABLE = "PYTHON_PORTABLE"

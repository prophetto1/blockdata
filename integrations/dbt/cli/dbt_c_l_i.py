from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cli\DbtCLI.java
# WARNING: Unresolved types: Exception, IOException

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, ClassVar, Optional

from engine.plugin.scripts.exec.abstract_exec_script import AbstractExecScript
from engine.plugin.scripts.runner.docker.docker import Docker
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.storages.kv.k_v_store import KVStore
from engine.core.models.property.property import Property
from engine.core.exceptions.resource_expired_exception import ResourceExpiredException
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from engine.core.models.flows.state import State
from engine.core.models.tasks.runners.task_runner import TaskRunner
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class DbtCLI(AbstractExecScript):
    """Run dbt commands via CLI"""
    commands: Property[list[str]]
    c_o_r_e__i_m_a_g_e: ClassVar[str] = "ghcr.io/kestra-io/dbt"
    f_u_s_i_o_n__i_m_a_g_e: ClassVar[str] = "ghcr.io/kestra-io/dbt-fusion"
    parse_run_results: Property[bool] = Property.ofValue(Boolean.TRUE)
    task_runner: TaskRunner[Any] = Docker.builder()
        .type(Docker.class.getName())
        .entryPoint(new ArrayList<>())
        .build()
    container_image: Property[str] = Property.ofValue(CORE_IMAGE)
    log_format: Property[LogFormat] = Property.ofValue(LogFormat.JSON)
    engine: Property[Engine] = Property.ofValue(Engine.CORE)
    profiles: Property[str] | None = None
    project_dir: Property[str] | None = None
    store_manifest: KvStoreManifest | None = None
    load_manifest: KvStoreManifest | None = None

    def inject_defaults(self, run_context: RunContext, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def parse_run_results(self, run_context: RunContext, project_working_directory: Path, run: ScriptOutput, store_manifest_kv_store: KVStore) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_and_store_manifest_if_exists(self, run_context: RunContext, load_manifest_kv_store: KVStore, project_working_directory: Path) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(ScriptOutput):
        warning_detected: bool = False

        def final_state(self) -> Optional[State.Type]:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class KvStoreManifest:
        key: Property[str]
        namespace: Property[str]

    class LogFormat(str, Enum):
        JSON = "JSON"
        TEXT = "TEXT"
        DEBUG = "DEBUG"
        NONE = "NONE"

    class Engine(str, Enum):
        CORE = "CORE"
        FUSION = "FUSION"

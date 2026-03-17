from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-docker\src\main\java\io\kestra\plugin\docker\Run.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.docker.abstract_docker import AbstractDocker
from engine.plugin.scripts.runner.docker.cpu import Cpu
from engine.plugin.scripts.runner.docker.device_request import DeviceRequest
from engine.core.models.tasks.input_files_interface import InputFilesInterface
from engine.plugin.scripts.runner.docker.memory import Memory
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.models.tasks.namespace_files_interface import NamespaceFilesInterface
from engine.core.models.tasks.output_files_interface import OutputFilesInterface
from engine.core.models.property.property import Property
from engine.plugin.scripts.runner.docker.pull_policy import PullPolicy
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput


@dataclass(slots=True, kw_only=True)
class Run(AbstractDocker):
    """Run a Docker container with runtime controls"""
    container_image: Property[str]
    pull_policy: Property[PullPolicy] = Property.ofValue(PullPolicy.IF_NOT_PRESENT)
    commands: Property[list[str]] = Property.ofValue(new ArrayList<>())
    wait: Property[bool] = Property.ofValue(true)
    user: Property[str] | None = None
    entry_point: Property[list[str]] | None = None
    extra_hosts: Property[list[str]] | None = None
    network_mode: Property[str] | None = None
    port_bindings: Property[list[str]] | None = None
    volumes: Property[list[str]] | None = None
    device_requests: list[DeviceRequest] | None = None
    cpu: Cpu | None = None
    memory: Memory | None = None
    shm_size: Property[str] | None = None
    privileged: Property[bool] | None = None
    env: Property[dict[str, str]] | None = None
    warning_on_std_err: Property[bool] | None = None
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    output_files: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

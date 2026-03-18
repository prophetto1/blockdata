from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cloudquery\src\main\java\io\kestra\plugin\cloudquery\CloudQueryCLI.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.cloudquery.abstract_cloud_query_command import AbstractCloudQueryCommand
from engine.plugin.scripts.exec.scripts.models.docker_options import DockerOptions
from engine.core.models.tasks.input_files_interface import InputFilesInterface
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.models.tasks.namespace_files_interface import NamespaceFilesInterface
from engine.core.models.tasks.output_files_interface import OutputFilesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput


@dataclass(slots=True, kw_only=True)
class CloudQueryCLI(AbstractCloudQueryCommand):
    """Run CloudQuery CLI commands"""
    commands: Property[list[str]]
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    output_files: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def inject_defaults(self, original: DockerOptions) -> DockerOptions:
        raise NotImplementedError  # TODO: translate from Java

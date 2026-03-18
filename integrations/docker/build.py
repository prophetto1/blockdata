from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-docker\src\main\java\io\kestra\plugin\docker\Build.java
# WARNING: Unresolved types: BuildResponseItem, Exception, api, com, command, core, dockerjava, github, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.docker.abstract_docker import AbstractDocker
from engine.core.models.tasks.input_files_interface import InputFilesInterface
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.models.tasks.namespace_files_interface import NamespaceFilesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Build(AbstractDocker):
    """Build and optionally push a Docker image"""
    tags: Property[list[str]]
    push: Property[bool] = Property.ofValue(false)
    pull: Property[bool] = Property.ofValue(true)
    dockerfile: Property[str] | None = None
    platforms: Property[list[str]] | None = None
    build_args: Property[dict[str, str]] | None = None
    labels: Property[dict[str, str]] | None = None
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def remove_scheme(self, string: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        image_id: str | None = None

    @dataclass(slots=True)
    class BuildImageResultCallback(BuildImageResultCallback):
        run_context: RunContext | None = None

        def on_next(self, item: BuildResponseItem) -> None:
            raise NotImplementedError  # TODO: translate from Java

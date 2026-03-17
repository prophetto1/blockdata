from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.docker.abstract_docker import AbstractDocker
from engine.core.models.tasks.input_files_interface import InputFilesInterface
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.models.tasks.namespace_files_interface import NamespaceFilesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Build(AbstractDocker, RunnableTask, NamespaceFilesInterface, InputFilesInterface):
    """Build and optionally push a Docker image"""
    dockerfile: Property[str] | None = None
    platforms: Property[list[String]] | None = None
    push: Property[bool] | None = None
    pull: Property[bool] | None = None
    tags: Property[list[String]]
    build_args: Property[dict[String, String]] | None = None
    labels: Property[dict[String, String]] | None = None
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def remove_scheme(self, string: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        image_id: str | None = None

    @dataclass(slots=True)
    class BuildImageResultCallback(com):
        run_context: RunContext | None = None

        def on_next(self, item: BuildResponseItem) -> None:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(io):
    image_id: str | None = None


@dataclass(slots=True, kw_only=True)
class BuildImageResultCallback(com):
    run_context: RunContext | None = None

    def on_next(self, item: BuildResponseItem) -> None:
        raise NotImplementedError  # TODO: translate from Java

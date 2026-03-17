from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.fs.vfs.abstract_vfs_interface import AbstractVfsInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractVfsTask(Task, AbstractVfsInterface):
    host: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    enable_ssh_rsa1: Property[bool]

    def fs_options(self, run_context: RunContext) -> FileSystemOptions:
        raise NotImplementedError  # TODO: translate from Java

    def scheme(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def uri(self, run_context: RunContext, filepath: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

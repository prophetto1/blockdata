from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\vfs\AbstractVfsTask.java
# WARNING: Unresolved types: FileSystemOptions, IOException, JSchException, URISyntaxException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.fs.vfs.abstract_vfs_interface import AbstractVfsInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractVfsTask(ABC, Task):
    enable_ssh_rsa1: Property[bool] = Property.ofValue(false)
    host: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None

    @abstractmethod
    def fs_options(self, run_context: RunContext) -> FileSystemOptions:
        ...

    @abstractmethod
    def scheme(self) -> str:
        ...

    def uri(self, run_context: RunContext, filepath: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

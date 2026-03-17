from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\adls\SharedAccess.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.azure.storage.adls.abstracts.abstract_data_lake_with_file import AbstractDataLakeWithFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class SharedAccess(AbstractDataLakeWithFile):
    """Create a Shared Access link for Azure Data Lake Storage."""
    expiration_date: Property[str]
    permissions: set[Permission]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    class Permission(str, Enum):
        READ = "READ"
        ADD = "ADD"
        CREATE = "CREATE"
        WRITE = "WRITE"
        DELETE = "DELETE"
        LIST = "LIST"
        MOVE = "MOVE"
        EXECUTE = "EXECUTE"
        MANAGE_OWNERSHIP = "MANAGE_OWNERSHIP"
        MANAGE_ACCESS_CONTROL = "MANAGE_ACCESS_CONTROL"

    @dataclass(slots=True)
    class Output:
        uri: str | None = None

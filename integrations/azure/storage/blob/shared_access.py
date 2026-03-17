from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.azure.storage.blob.abstracts.abstract_blob_storage_object import AbstractBlobStorageObject
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class Permission(str, Enum):
    READ = "READ"
    ADD = "ADD"
    CREATE = "CREATE"
    WRITE = "WRITE"
    DELETE = "DELETE"
    DELETE_VERSION = "DELETE_VERSION"
    TAGS = "TAGS"
    LIST = "LIST"
    MOVE = "MOVE"
    EXECUTE = "EXECUTE"
    FILTER = "FILTER"
    IMMUTABILITY_POLICY = "IMMUTABILITY_POLICY"


@dataclass(slots=True, kw_only=True)
class SharedAccess(AbstractBlobStorageObject, RunnableTask):
    """Create a shared access link on Azure Blob Storage."""
    expiration_date: Property[str]
    permissions: set[Permission]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None

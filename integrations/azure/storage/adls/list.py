from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.adls.abstracts.abstract_data_lake_connection import AbstractDataLakeConnection
from integrations.azure.storage.adls.abstracts.abstract_data_lake_storage_interface import AbstractDataLakeStorageInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractDataLakeConnection, RunnableTask, AbstractDataLakeStorageInterface):
    """Upload a file to Azure Data Lake Storage."""
    directory_path: Property[str]
    file_system: Property[str] | None = None
    max_files: Property[int] | None = None

    def run(self, run_context: RunContext) -> list:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        files: java | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    files: java | None = None

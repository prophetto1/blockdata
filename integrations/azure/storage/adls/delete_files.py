from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.adls.abstracts.abstract_data_lake_connection import AbstractDataLakeConnection
from integrations.azure.storage.adls.abstracts.abstract_data_lake_storage_interface import AbstractDataLakeStorageInterface
from integrations.azure.storage.adls.models.adls_file import AdlsFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DeleteFiles(AbstractDataLakeConnection, RunnableTask, AbstractDataLakeStorageInterface):
    """Delete a list of objects from Azure Data Lake Storage."""
    file_system: Property[str] | None = None
    directory_path: Property[str]
    concurrent: int | None = None
    error_on_empty: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, logger: Logger, file_system_client: DataLakeFileSystemClient) -> Function[AdlsFile, Long]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        count: int = 0
        size: int = 0


@dataclass(slots=True, kw_only=True)
class Output(io):
    count: int = 0
    size: int = 0

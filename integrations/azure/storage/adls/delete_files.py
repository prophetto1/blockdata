from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\adls\DeleteFiles.java
# WARNING: Unresolved types: DataLakeFileSystemClient, Exception, Function, Logger, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.adls.abstracts.abstract_data_lake_connection import AbstractDataLakeConnection
from integrations.azure.storage.adls.abstracts.abstract_data_lake_storage_interface import AbstractDataLakeStorageInterface
from integrations.azure.storage.adls.models.adls_file import AdlsFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DeleteFiles(AbstractDataLakeConnection):
    """Delete a list of objects from Azure Data Lake Storage."""
    directory_path: Property[str]
    error_on_empty: Property[bool] = Property.ofValue(false)
    file_system: Property[str] | None = None
    concurrent: int | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def delete(logger: Logger, file_system_client: DataLakeFileSystemClient) -> Function[AdlsFile, int]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        count: int = 0
        size: int = 0

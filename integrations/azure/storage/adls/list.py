from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\adls\List.java
# WARNING: Unresolved types: Exception, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.adls.abstracts.abstract_data_lake_connection import AbstractDataLakeConnection
from integrations.azure.storage.adls.abstracts.abstract_data_lake_storage_interface import AbstractDataLakeStorageInterface
from integrations.azure.storage.adls.models.adls_file import AdlsFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractDataLakeConnection):
    """Upload a file to Azure Data Lake Storage."""
    directory_path: Property[str]
    max_files: Property[int] = Property.ofValue(25)
    file_system: Property[str] | None = None

    def run(self, run_context: RunContext) -> List.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        files: java.util.List[AdlsFile] | None = None

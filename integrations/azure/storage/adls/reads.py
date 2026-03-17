from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.adls.abstracts.abstract_data_lake_connection import AbstractDataLakeConnection
from integrations.azure.storage.adls.abstracts.abstract_data_lake_storage_interface import AbstractDataLakeStorageInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Reads(AbstractDataLakeConnection, RunnableTask, AbstractDataLakeStorageInterface):
    """Read all files from an Azure Data Lake Storage directory."""
    directory_path: Property[str]
    file_system: Property[str] | None = None
    max_files: Property[int] | None = None

    def run(self, run_context: RunContext) -> Reads:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        files: java | None = None
        output_files: dict[String, URI] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    files: java | None = None
    output_files: dict[String, URI] | None = None

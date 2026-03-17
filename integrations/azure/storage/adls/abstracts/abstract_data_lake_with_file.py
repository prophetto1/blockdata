from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.adls.abstracts.abstract_data_lake_connection import AbstractDataLakeConnection
from integrations.azure.storage.adls.abstracts.abstract_data_lake_storage_interface import AbstractDataLakeStorageInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractDataLakeWithFile(AbstractDataLakeConnection, AbstractDataLakeStorageInterface):
    file_path: Property[str]
    file_system: Property[str] | None = None

    def data_lake_file_client(self, run_context: RunContext) -> DataLakeFileClient:
        raise NotImplementedError  # TODO: translate from Java

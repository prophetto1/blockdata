from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\adls\abstracts\AbstractDataLakeWithFile.java
# WARNING: Unresolved types: DataLakeFileClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.adls.abstracts.abstract_data_lake_connection import AbstractDataLakeConnection
from integrations.azure.storage.adls.abstracts.abstract_data_lake_storage_interface import AbstractDataLakeStorageInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractDataLakeWithFile(ABC, AbstractDataLakeConnection):
    file_path: Property[str]
    file_system: Property[str] | None = None

    def data_lake_file_client(self, run_context: RunContext) -> DataLakeFileClient:
        raise NotImplementedError  # TODO: translate from Java

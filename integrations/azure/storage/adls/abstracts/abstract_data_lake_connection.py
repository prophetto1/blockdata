from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\adls\abstracts\AbstractDataLakeConnection.java
# WARNING: Unresolved types: DataLakeServiceClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.abstracts.abstract_storage_with_sas import AbstractStorageWithSas
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractDataLakeConnection(ABC, AbstractStorageWithSas):

    def data_lake_service_client(self, run_context: RunContext) -> DataLakeServiceClient:
        raise NotImplementedError  # TODO: translate from Java

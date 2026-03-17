from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\blob\abstracts\AbstractBlobStorageWithSas.java
# WARNING: Unresolved types: BlobServiceClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.abstracts.abstract_storage_with_sas import AbstractStorageWithSas
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractBlobStorageWithSas(ABC, AbstractStorageWithSas):

    def client(self, run_context: RunContext) -> BlobServiceClient:
        raise NotImplementedError  # TODO: translate from Java

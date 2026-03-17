from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\blob\abstracts\AbstractBlobStorage.java
# WARNING: Unresolved types: BlobServiceClient

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.abstracts.abstract_storage import AbstractStorage
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractBlobStorage(ABC, AbstractStorage):

    def client(self, run_context: RunContext) -> BlobServiceClient:
        raise NotImplementedError  # TODO: translate from Java

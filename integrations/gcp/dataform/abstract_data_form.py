from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\dataform\AbstractDataForm.java
# WARNING: Unresolved types: DataformClient, Exception, IOException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractDataForm(ABC, AbstractTask):
    location: Property[str]
    repository_id: Property[str]

    def dataform_client(self, run_context: RunContext) -> DataformClient:
        raise NotImplementedError  # TODO: translate from Java

    def create_client(self, run_context: RunContext) -> DataformClient:
        raise NotImplementedError  # TODO: translate from Java

    def build_repository_path(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

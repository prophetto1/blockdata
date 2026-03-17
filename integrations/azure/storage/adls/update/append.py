from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\adls\update\Append.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.adls.abstracts.abstract_data_lake_with_file import AbstractDataLakeWithFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Append(AbstractDataLakeWithFile):
    """Append data to an existing file in Azure Data Lake Storage."""
    data: Property[str]

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

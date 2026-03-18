from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\adls\Delete.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.azure.storage.adls.abstracts.abstract_data_lake_with_file import AbstractDataLakeWithFile
from integrations.azure.storage.adls.models.adls_file import AdlsFile
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Delete(AbstractDataLakeWithFile):
    """Delete a file from Azure Data Lake Storage."""

    def run(self, run_context: RunContext) -> Delete.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        file: AdlsFile | None = None

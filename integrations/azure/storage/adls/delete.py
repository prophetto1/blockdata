from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.storage.adls.abstracts.abstract_data_lake_with_file import AbstractDataLakeWithFile
from integrations.azure.storage.adls.models.adls_file import AdlsFile
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Delete(AbstractDataLakeWithFile, RunnableTask):
    """Delete a file from Azure Data Lake Storage."""

    def run(self, run_context: RunContext) -> Delete:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        file: AdlsFile | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    file: AdlsFile | None = None

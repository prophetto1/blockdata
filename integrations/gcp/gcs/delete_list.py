from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.gcs.abstract_list import AbstractList
from integrations.gcp.gcs.models.blob import Blob
from integrations.gcp.gcs.list_interface import ListInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.storages.storage import Storage


@dataclass(slots=True, kw_only=True)
class DeleteList(AbstractList, RunnableTask, ListInterface):
    """Delete multiple GCS objects"""
    error_on_empty: Property[bool] | None = None
    concurrent: int | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def filter(self, blob: com, reg_exp: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, logger: Logger, connection: Storage) -> Function[Blob, Long]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        count: int = 0
        size: int = 0


@dataclass(slots=True, kw_only=True)
class Output(io):
    count: int = 0
    size: int = 0

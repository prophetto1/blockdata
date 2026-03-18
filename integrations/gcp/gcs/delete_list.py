from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\DeleteList.java
# WARNING: Unresolved types: Exception, Function, Logger, cloud, com, core, google, io, kestra, models, storage, tasks

from dataclasses import dataclass
from typing import Any

from integrations.gcp.gcs.abstract_list import AbstractList
from integrations.azure.storage.blob.models.blob import Blob
from integrations.aws.s3.list_interface import ListInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.storages.storage import Storage


@dataclass(slots=True, kw_only=True)
class DeleteList(AbstractList):
    """Delete multiple GCS objects"""
    error_on_empty: Property[bool] = Property.ofValue(false)
    concurrent: int | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def filter(self, blob: com.google.cloud.storage.Blob, reg_exp: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def delete(logger: Logger, connection: Storage) -> Function[Blob, int]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        count: int = 0
        size: int = 0

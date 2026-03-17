from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\List.java
# WARNING: Unresolved types: Exception, Filter, cloud, com, core, google, io, java, kestra, models, storage, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.gcp.gcs.abstract_list import AbstractList
from integrations.azure.storage.blob.models.blob import Blob
from integrations.aws.s3.list_interface import ListInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractList):
    """List GCS objects"""
    filter: Property[Filter] = Property.ofValue(Filter.BOTH)
    max_files: Property[int] = Property.ofValue(25)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def filter(self, blob: com.google.cloud.storage.Blob, reg_exp: str, filter: Filter) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        blobs: java.util.List[Blob] | None = None

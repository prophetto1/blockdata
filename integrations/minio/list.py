from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-minio\src\main\java\io\kestra\plugin\minio\List.java
# WARNING: Unresolved types: Exception, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.minio.abstract_minio_object import AbstractMinioObject
from integrations.microsoft365.sharepoint.models.item import Item
from integrations.minio.model.minio_object import MinioObject
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractMinioObject):
    """List objects on a MinIO bucket."""
    max_keys: Property[int] = Property.ofValue(1000)
    filter: Property[Filter] = Property.ofValue(Filter.BOTH)
    recursive: Property[bool] = Property.ofValue(true)
    include_versions: Property[bool] = Property.ofValue(true)
    prefix: Property[str] | None = None
    start_after: Property[str] | None = None
    delimiter: Property[str] | None = None
    marker: Property[str] | None = None
    regexp: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def filter(self, object: Item, reg_exp: str, filter: Filter) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    class Filter(str, Enum):
        FILES = "FILES"
        DIRECTORY = "DIRECTORY"
        BOTH = "BOTH"

    @dataclass(slots=True)
    class Output:
        objects: java.util.List[MinioObject] | None = None

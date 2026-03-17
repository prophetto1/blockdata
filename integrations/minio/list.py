from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.minio.abstract_minio_object import AbstractMinioObject
from integrations.microsoft365.sharepoint.models.item import Item
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class Filter(str, Enum):
    FILES = "FILES"
    DIRECTORY = "DIRECTORY"
    BOTH = "BOTH"


@dataclass(slots=True, kw_only=True)
class List(AbstractMinioObject, RunnableTask):
    """List objects on a MinIO bucket."""
    prefix: Property[str] | None = None
    start_after: Property[str] | None = None
    delimiter: Property[str] | None = None
    marker: Property[str] | None = None
    max_keys: Property[int] | None = None
    regexp: Property[str] | None = None
    filter: Property[Filter] | None = None
    recursive: Property[bool] | None = None
    include_versions: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def filter(self, object: Item, reg_exp: str, filter: Filter) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        objects: java | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    objects: java | None = None

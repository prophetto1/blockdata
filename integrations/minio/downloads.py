from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.minio.abstract_minio_object import AbstractMinioObject
from integrations.minio.copy import Copy
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class Action(str, Enum):
    MOVE = "MOVE"
    DELETE = "DELETE"
    NONE = "NONE"


@dataclass(slots=True, kw_only=True)
class Downloads(AbstractMinioObject, RunnableTask):
    """Downloads multiple files from a MinIO bucket."""
    prefix: Property[str] | None = None
    delimiter: Property[str] | None = None
    marker: Property[str] | None = None
    max_keys: Property[int] | None = None
    regexp: Property[str] | None = None
    filter: Property[io] | None = None
    action: Property[Action]
    move_to: Copy | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        objects: java | None = None
        output_files: dict[String, URI] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    objects: java | None = None
    output_files: dict[String, URI] | None = None

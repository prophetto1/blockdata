from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.gcs.abstract_gcs import AbstractGcs
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Delete(AbstractGcs, RunnableTask):
    """Delete a GCS object"""
    uri: Property[str] | None = None
    error_on_missing: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None
        deleted: bool | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None
    deleted: bool | None = None

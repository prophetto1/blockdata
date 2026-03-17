from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.cloudflare.abstract_cloudflare_task import AbstractCloudflareTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Batch(AbstractCloudflareTask, RunnableTask):
    """Batch mutate DNS records"""
    zone_id: Property[str]
    posts: Property[list[RecordInput]] | None = None
    patches: Property[list[RecordPatch]] | None = None
    deletes: Property[list[RecordDelete]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        success: bool | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    success: bool | None = None

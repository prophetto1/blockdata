from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.cloudflare.abstract_cloudflare_task import AbstractCloudflareTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Purge(AbstractCloudflareTask, RunnableTask):
    """Purge Cloudflare cached content"""
    zone_id: Property[str]
    purge_all: Property[bool] | None = None
    files: Property[list[String]] | None = None
    tags: Property[list[String]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        request_id: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    request_id: str | None = None

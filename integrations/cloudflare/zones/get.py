from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.cloudflare.abstract_cloudflare_task import AbstractCloudflareTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Get(AbstractCloudflareTask, RunnableTask):
    """Fetch Cloudflare zone"""
    zone_id: Property[str] | None = None
    hostname: Property[str] | None = None

    def is_valid_input(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_output(self, result: ZoneResponse) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        id: str | None = None
        name: str | None = None
        status: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    id: str | None = None
    name: str | None = None
    status: str | None = None

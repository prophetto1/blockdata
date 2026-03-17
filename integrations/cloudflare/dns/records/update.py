from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.cloudflare.abstract_cloudflare_task import AbstractCloudflareTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Update(AbstractCloudflareTask, RunnableTask):
    """Update Cloudflare DNS record"""
    zone_id: Property[str]
    record_id: Property[str]
    record_type: Property[DnsRecordType] | None = None
    name: Property[str] | None = None
    content: Property[str] | None = None
    ttl: Property[int] | None = None
    proxied: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        id: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    id: str | None = None

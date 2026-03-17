from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.cloudflare.abstract_cloudflare_task import AbstractCloudflareTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Delete(AbstractCloudflareTask, RunnableTask):
    """Delete Cloudflare IP access rule"""
    zone_id: Property[str] | None = None
    account_id: Property[str] | None = None
    rule_id: Property[str]

    def is_valid_scope(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        rule_id: str | None = None
        deleted: bool | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    rule_id: str | None = None
    deleted: bool | None = None

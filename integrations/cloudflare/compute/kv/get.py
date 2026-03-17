from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.cloudflare.abstract_cloudflare_task import AbstractCloudflareTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Get(AbstractCloudflareTask, RunnableTask):
    """Bulk read Workers KV items"""
    account_id: Property[str]
    namespace_id: Property[str]
    keys: Property[list[String]]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        values: dict[String, Object] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    values: dict[String, Object] | None = None

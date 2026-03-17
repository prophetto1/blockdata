from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.cloudflare.abstract_cloudflare_task import AbstractCloudflareTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractCloudflareTask, RunnableTask):
    """Create Workers KV namespace"""
    account_id: Property[str]
    title: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        namespace_id: str | None = None
        title: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    namespace_id: str | None = None
    title: str | None = None

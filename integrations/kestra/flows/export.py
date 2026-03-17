from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kestra.abstract_kestra_task import AbstractKestraTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Export(AbstractKestraTask, RunnableTask):
    """Export flows by namespace/labels"""
    namespace: Property[str] | None = None
    labels: Property[list[String]] | None = None

    def run(self, run_context: RunContext) -> Export:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        flows_zip: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    flows_zip: str | None = None

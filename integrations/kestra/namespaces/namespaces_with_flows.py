from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kestra.abstract_kestra_task import AbstractKestraTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class NamespacesWithFlows(AbstractKestraTask, RunnableTask):
    """List distinct namespaces"""
    prefix: Property[str] | None = None

    def run(self, run_context: RunContext) -> NamespacesWithFlows:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        namespaces: java | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    namespaces: java | None = None

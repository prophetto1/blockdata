from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kestra.abstract_kestra_task import AbstractKestraTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class List(AbstractKestraTask, RunnableTask):
    """List namespaces with paging"""
    prefix: Property[str] | None = None
    page: Property[int] | None = None
    size: Property[int] | None = None
    existing_only: Property[bool] | None = None

    def run(self, run_context: RunContext) -> list:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        namespaces: java | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    namespaces: java | None = None

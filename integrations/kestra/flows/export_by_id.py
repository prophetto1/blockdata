from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kestra.abstract_kestra_task import AbstractKestraTask
from engine.webserver.controllers.domain.id_with_namespace import IdWithNamespace
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ExportById(AbstractKestraTask, RunnableTask):
    """Export flows by id"""
    flows: Property[list[IdWithNamespace]] | None = None

    def run(self, run_context: RunContext) -> ExportById:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        flows_zip: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    flows_zip: str | None = None
